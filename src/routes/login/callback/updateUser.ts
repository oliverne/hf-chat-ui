import { refreshSessionCookie } from "$lib/server/auth";
import { collections } from "$lib/server/database";
import { ObjectId } from "mongodb";
import { DEFAULT_SETTINGS } from "$lib/types/Settings";
import { z } from "zod";
import type { UserinfoResponse } from "openid-client";
import { error, type Cookies } from "@sveltejs/kit";
import crypto from "crypto";
import { sha256 } from "$lib/utils/sha256";
import { addWeeks } from "date-fns";
import { OIDConfig, getOIDCClient } from "$lib/server/auth";
import { env } from "$env/dynamic/private";
import { logger } from "$lib/server/logger";

export async function updateUser(params: {
	userData: UserinfoResponse;
	locals: App.Locals;
	cookies: Cookies;
	userAgent?: string;
	ip?: string;
	idToken: string; // Added idToken parameter
	accessToken?: string; // Optional: if you need access token for API calls later
}) {
	const { userData, locals, cookies, userAgent, ip, idToken, accessToken } = params;

	// Use standard OIDC claims. Adjust if your Keycloak setup uses different claim names.
	const {
		preferred_username: username, // Often used for username
		name, // Standard claim for full name
		email, // Standard claim for email
		picture: avatarUrl, // Standard claim for profile picture URL
		sub: hfUserId, // Standard claim for subject identifier (unique user ID from provider)
		// Add other claims you need from Keycloak, e.g., roles, groups
		realm_access, // Example: Keycloak often puts realm roles here
		groups, // Example: Keycloak might put group memberships here
	} = z
		.object({
			preferred_username: z.string().optional(),
			name: z.string().optional(), // Make optional if not guaranteed
			picture: z.string().optional(),
			sub: z.string(),
			email: z.string().email().optional(),
			// Define expected structure for roles/groups if needed for authorization
			realm_access: z.object({ roles: z.array(z.string()) }).optional(),
			groups: z.array(z.string()).optional(),
			// Ensure the claim specified in OPENID_NAME_CLAIM exists
			[OIDConfig.NAME_CLAIM]: z.string().optional(),
		})
		// Ensure 'name' is populated, falling back to preferred_username or email if necessary
		.refine((data) => data[OIDConfig.NAME_CLAIM] || data.preferred_username || data.email, {
			message: `Claim specified by OPENID_NAME_CLAIM ('${OIDConfig.NAME_CLAIM}'), preferred_username, or email must be provided.`,
		})
		.transform((data) => ({
			...data,
			// Use the configured name claim, fallback to preferred_username, then email
			name: data[OIDConfig.NAME_CLAIM] || data.preferred_username || data.email,
		}))
		.parse(userData); // Removed 'as ...' for better type inference

	// Dynamically access user data based on NAME_CLAIM from environment
	// This approach allows us to adapt to different OIDC providers flexibly.

	logger.info(
		{
			login_sub: hfUserId, // Log the unique subject identifier
			login_username: username,
			login_name: name,
			login_email: email,
			login_roles: realm_access?.roles, // Log roles if available
			login_groups: groups, // Log groups if available
		},
		"user login"
	);

	// --- Keycloak specific authorization ---
	// Replace YOUR_KEYCLOAK_ADMIN_ROLE and YOUR_KEYCLOAK_EARLY_ACCESS_ROLE
	// with the actual role names from your Keycloak realm.
	// Adjust the logic if using groups or different claim structures.
	const userRoles = realm_access?.roles ?? [];
	const isAdmin = userRoles.includes(env.KEYCLOAK_ADMIN_ROLE || "YOUR_KEYCLOAK_ADMIN_ROLE");
	const isEarlyAccess = userRoles.includes(
		env.KEYCLOAK_EARLY_ACCESS_ROLE || "YOUR_KEYCLOAK_EARLY_ACCESS_ROLE"
	);
	// --- End Keycloak specific authorization ---

	logger.debug(
		{
			isAdmin,
			isEarlyAccess,
			hfUserId,
		},
		`Updating user ${hfUserId}`
	);

	// check if user already exists
	const existingUser = await collections.users.findOne({ hfUserId });
	let userId = existingUser?._id;

	// update session cookie on login
	const previousSessionId = locals.sessionId;
	const secretSessionId = crypto.randomUUID();
	const sessionId = await sha256(secretSessionId);

	if (await collections.sessions.findOne({ sessionId })) {
		error(500, "Session ID collision");
	}

	locals.sessionId = sessionId;

	if (existingUser) {
		// update existing user if any
		await collections.users.updateOne(
			{ _id: existingUser._id },
			{ $set: { username, name, avatarUrl, isAdmin, isEarlyAccess } }
		);

		// remove previous session if it exists and add new one
		await collections.sessions.deleteOne({ sessionId: previousSessionId });
		await collections.sessions.insertOne({
			_id: new ObjectId(),
			sessionId: locals.sessionId,
			userId: existingUser._id,
			createdAt: new Date(),
			updatedAt: new Date(),
			userAgent,
			ip,
			expiresAt: addWeeks(new Date(), 2),
			idToken, // Store idToken
			accessToken, // Store access token if provided
		});
	} else {
		// user doesn't exist yet, create a new one
		const { insertedId } = await collections.users.insertOne({
			_id: new ObjectId(),
			createdAt: new Date(),
			updatedAt: new Date(),
			username,
			name,
			email,
			avatarUrl,
			hfUserId,
			isAdmin,
			isEarlyAccess,
		});

		userId = insertedId;

		await collections.sessions.insertOne({
			_id: new ObjectId(),
			sessionId: locals.sessionId,
			userId,
			createdAt: new Date(),
			updatedAt: new Date(),
			userAgent,
			ip,
			expiresAt: addWeeks(new Date(), 2),
			idToken, // Store idToken
			accessToken, // Store access token if provided
		});

		// move pre-existing settings to new user
		const { matchedCount } = await collections.settings.updateOne(
			{ sessionId: previousSessionId },
			{
				$set: { userId, updatedAt: new Date() },
				$unset: { sessionId: "" },
			}
		);

		if (!matchedCount) {
			// if no settings found for user, create default settings
			await collections.settings.insertOne({
				userId,
				ethicsModalAcceptedAt: new Date(),
				updatedAt: new Date(),
				createdAt: new Date(),
				...DEFAULT_SETTINGS,
			});
		}
	}

	// refresh session cookie
	refreshSessionCookie(cookies, secretSessionId);

	// migrate pre-existing conversations
	await collections.conversations.updateMany(
		{ sessionId: previousSessionId },
		{
			$set: { userId },
			$unset: { sessionId: "" },
		}
	);
}
