# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run linting (prettier + eslint)
- `npm run format` - Format code with prettier
- `npm run test` - Run tests with vitest
- `npm run test -- path/to/file.spec.ts` - Run a single test file
- `npm run check` - Run type checking

## Code Style
- Use tabs for indentation (not spaces)
- Line width: 100 characters
- Trailing commas in arrays/objects
- Use TypeScript with strict type checking; avoid `any` types
- Prefix unused variables with underscore (e.g., `_unusedVar`)
- Prefer object shorthand syntax
- Use ES modules (import/export)
- Follow SvelteKit conventions for routes/components
- Use Tailwind for styling
- Files are organized by feature in the src/lib directory
- Test files use `.spec.ts` suffix with vitest for testing

## Rules for AI
- Always answer in Korean
