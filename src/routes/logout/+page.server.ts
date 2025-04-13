import { dev } from "$app/environment";
import { base } from "$app/paths";
import { env } from "$env/dynamic/private";
import { collections } from "$lib/server/database";
import { redirect, error } from "@sveltejs/kit";
import { getOIDCClient, OIDConfig, requiresUser } from "$lib/server/auth";
import { logger } from "$lib/server/logger";

export const actions = {
	async default({ cookies, locals, url }) {
		const session = await collections.sessions.findOne({ sessionId: locals.sessionId });

		// Delete local session regardless of OIDC usage
		if (session) {
			await collections.sessions.deleteOne({ _id: session._id });
		}

		// Delete cookie
		cookies.delete(env.COOKIE_NAME, {
			path: "/",
			sameSite: dev || env.ALLOW_INSECURE_COOKIES === "true" ? "lax" : "none",
			secure: !dev && !(env.ALLOW_INSECURE_COOKIES === "true"),
			httpOnly: true,
		});

		// If OIDC is not configured or session/id_token is missing, just redirect to home
		if (!requiresUser || !session?.idToken) {
			redirect(303, `${base}/`);
			return; // Ensure redirect is the last action
		}

		// OIDC Logout
		try {
			// Construct the post-logout redirect URI, default to base URL
			const postLogoutRedirectUri = `${url.origin}${base}/`;

			// Get OIDC client - assuming redirectURI isn't strictly needed for endSessionUrl
			// but providing a dummy one if the library requires it. Check openid-client docs.
			const client = await getOIDCClient({ redirectURI: `${url.origin}${base}/login/callback` });

			const endSessionUrl = client.endSessionUrl({
				id_token_hint: session.idToken,
				post_logout_redirect_uri: postLogoutRedirectUri,
				// Add other Keycloak specific parameters if needed
			});

			logger.debug({ endSessionUrl }, "Redirecting to OIDC end session endpoint");
			redirect(303, endSessionUrl);
		} catch (err) {
			logger.error({ error: err }, "Error constructing OIDC end session URL");
			// Fallback redirect to home page if OIDC logout fails
			error(500, "Failed to initiate logout. Please clear your cookies.");
		}
	},
};
