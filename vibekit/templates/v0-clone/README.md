# Vibe0 (v0-clone)

A Next.js app template powered by VibeKit SDK, Inngest, Convex, and Anthropic Claude. This application enables collaborative AI-driven development with real-time updates, GitHub integration, and sandboxed code execution using Northflank.

## ✨ Features

- 🤖 AI-powered code generation using Anthropic Claude
- 🔄 Real-time task updates with Inngest
- 🐙 GitHub integration for repository management
- 🏗️ Sandboxed environment execution with Northflank
- 📦 State management with Convex
- 🎨 Modern UI with Tailwind CSS and shadcn/ui
- 🗃️ TypeScript-first, modular architecture

## 🚀 Prerequisites

Before you begin, make sure you have:

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Inngest CLI** (for local development)
- **Convex account** (for state management)
- **Anthropic API key**
- **Northflank API key and project ID**
- **GitHub OAuth app** (for GitHub integration)

## 📦 Installation

### 1. Install Dependencies

```bash
npm install
```

### 2. Install Inngest CLI

The Inngest CLI is required for running background functions locally:

```bash
# Install globally
npm install -g inngest

# Or using npx (recommended)
npx inngest-cli@latest
```

### 3. Set Up Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```bash
# Anthropic Claude API Key
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Northflank Configuration
NORTHFLANK_API_KEY=your_northflank_api_key_here
NORTHFLANK_PROJECT_ID=your_northflank_project_id_here

# Convex Configuration
NEXT_PUBLIC_CONVEX_URL=your_convex_url_here

# GitHub OAuth Configuration
AUTH_GITHUB_ID=your_github_client_id
AUTH_GITHUB_SECRET=your_github_client_secret
```

#### Getting API Keys:

- **Anthropic API Key**: Get it from [Anthropic Console](https://console.anthropic.com/)
- **Northflank API Key/Project ID**: [Northflank Dashboard](https://northflank.com/)
- **Convex URL**: [Convex Console](https://dashboard.convex.dev/)
- **GitHub OAuth**: Create a new OAuth app in your [GitHub Developer Settings](https://github.com/settings/developers)

## 🛠️ Development

### 1. Start the Inngest Dev Server

In one terminal, start the Inngest development server:

```bash
npx inngest-cli@latest dev
```

This will start the Inngest development server on `http://localhost:8288`.

### 2. Start the Next.js Development Server

In another terminal, start the Next.js application:

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

## 📋 Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build the application for production
- `npm start` - Start the production server
- `npm run lint` - Run ESLint for code quality

## 🏗️ Project Structure

```
├── app/                    # Next.js App Router
│   ├── actions/            # Server actions
│   ├── api/                # API routes
│   └── session/            # Session pages
├── components/             # Reusable UI components
│   └── ui/                 # shadcn/ui components
├── convex/                 # Convex schema and functions
├── lib/                    # Utility libraries and configurations
├── providers/              # React providers (auth, convex, theme)
├── public/                 # Static assets
```

## 🔧 Configuration

### Inngest Functions

The application uses Inngest for background task processing. Main functions are defined in `lib/inngest.ts` and handle AI code generation, session management, and real-time updates.

### VibeKit Integration

The app integrates with VibeKit SDK for AI code generation, supporting:

- Anthropic Claude as the AI model
- Northflank for sandboxed environments
- GitHub repository integration
- Real-time streaming updates

### Convex

Convex is used for state management and real-time data sync. See the `convex/` directory for schema and server functions.

## 🌐 Deployment

### Environment Variables for Production

Set all required environment variables in your production environment:

```bash
AUTH_GITHUB_ID=
AUTH_GITHUB_SECRET=
NORTHFLANK_API_KEY=
NORTHFLANK_PROJECT_ID=
NEXT_PUBLIC_CONVEX_URL=
ANTHROPIC_API_KEY=
```

### Deploy to Vercel

1. Connect your repository to Vercel
2. Set the environment variables in the Vercel dashboard
3. Deploy

### Inngest in Production

For production, configure Inngest properly:

1. Set up an Inngest account at [inngest.com](https://inngest.com)
2. Configure your production Inngest endpoint
3. Update your deployment to use the production Inngest configuration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Troubleshooting

### Common Issues

1. **Inngest functions not working**: Make sure the Inngest CLI is running (`npx inngest-cli@latest dev`)
2. **API key errors**: Verify all environment variables are set correctly
3. **GitHub OAuth issues**: Check your GitHub OAuth app configuration and callback URLs
4. **Northflank connection problems**: Ensure your Northflank API key and project ID are valid
5. **Convex issues**: Make sure your Convex URL is correct and your account is active

### Getting Help

- Check the [Inngest Documentation](https://www.inngest.com/docs)
- Visit [VibeKit Documentation](https://vibekit.dev/docs)
- Review [Next.js Documentation](https://nextjs.org/docs)
- See [Convex Documentation](https://docs.convex.dev/)
- Explore [Anthropic API Docs](https://docs.anthropic.com/claude)
- Visit [Northflank Docs](https://northflank.com/docs)

---

Built with ❤️ using Next.js, VibeKit, Inngest, Convex, and Anthropic Claude
