# Snagio Deployment Guide

## Prerequisites

Before deploying, ensure you have:
1. A Supabase project set up with the database schema
2. All required environment variables from your Supabase project
3. Storage bucket created for photos (snag-photos)

## Deployment Options

### Option 1: Vercel (Recommended)

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Deploy to Vercel**
   ```bash
   vercel
   ```

3. **Set Environment Variables**
   - Go to your Vercel project dashboard
   - Navigate to Settings > Environment Variables
   - Add all variables from `.env.example`

4. **Configure Domain (Optional)**
   - In Vercel dashboard, go to Settings > Domains
   - Add your custom domain

### Option 2: Deploy via GitHub

1. **Push to GitHub**
   ```bash
   git remote add origin https://github.com/yourusername/snagio.git
   git push -u origin main
   ```

2. **Connect to Vercel**
   - Go to https://vercel.com/new
   - Import your GitHub repository
   - Configure environment variables
   - Deploy

### Option 3: Other Platforms

#### Netlify
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod
```

#### Railway
- Connect GitHub repo at https://railway.app
- Add environment variables
- Deploy

## Environment Variables

Required variables (see `.env.example`):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY`
- `DATABASE_URL`
- `DIRECT_URL`

## Post-Deployment Checklist

- [ ] Verify all environment variables are set
- [ ] Test authentication (login/register)
- [ ] Test file uploads
- [ ] Verify PWA installation works
- [ ] Check offline functionality
- [ ] Test PDF export
- [ ] Monitor error logs

## Database Setup

If deploying to a new Supabase project:

1. Run migrations:
   ```bash
   npx prisma migrate deploy
   ```

2. Set up storage policies in Supabase dashboard

3. Enable Row Level Security (RLS) on all tables

## Troubleshooting

### Build Failures
- Check all TypeScript errors are resolved
- Ensure all environment variables are set
- Run `npm run build` locally first

### Runtime Errors
- Check Supabase project is active
- Verify RLS policies are correct
- Check storage bucket permissions

### Performance Issues
- Enable caching headers
- Optimize images before upload
- Use CDN for static assets