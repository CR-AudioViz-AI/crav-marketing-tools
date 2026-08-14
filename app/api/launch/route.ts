export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
// ============================================================================
// CR AUDIOVIZ AI - LAUNCH CHECKLIST API
// GET /api/launch - Get personalized launch checklist with FREE sites
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { LAUNCH_SITES, getLaunchSitesForCategory } from '@/lib/free-apis';

interface LaunchTask {
  id: string;
  category: string;
  task: string;
  description: string;
  daysBeforeLaunch: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  resources?: { name: string; url: string }[];
  tips?: string[];
}

// Pre-launch checklist tasks
const LAUNCH_TASKS: LaunchTask[] = [
  // 4 Weeks Before
  {
    id: 'audience-research',
    category: 'Research',
    task: 'Complete audience research',
    description: 'Define your target audience, create buyer personas, and identify where they hang out online',
    daysBeforeLaunch: 28,
    priority: 'critical',
    tips: [
      'Use Reddit and Twitter to find conversations about your problem',
      'Interview 5-10 potential users if possible',
      'Document pain points and language they use',
    ],
  },
  {
    id: 'messaging',
    category: 'Content',
    task: 'Finalize value proposition and messaging',
    description: 'Create your core messaging, tagline, and key benefits',
    daysBeforeLaunch: 28,
    priority: 'critical',
    tips: [
      'Test messaging with potential users',
      'Keep it simple and benefit-focused',
      'Avoid jargon - use customer language',
    ],
  },
  {
    id: 'landing-page',
    category: 'Website',
    task: 'Build launch landing page',
    description: 'Create a conversion-optimized landing page with clear CTA',
    daysBeforeLaunch: 21,
    priority: 'critical',
    resources: [
      { name: 'Carrd (Free)', url: 'https://carrd.co' },
      { name: 'Framer (Free tier)', url: 'https://framer.com' },
      { name: 'javari Landing Builder', url: 'https://craudiovizai.com/tools/landing' },
    ],
  },
  {
    id: 'visuals',
    category: 'Content',
    task: 'Create launch visuals',
    description: 'Product screenshots, demo video, social graphics, and Product Hunt assets',
    daysBeforeLaunch: 14,
    priority: 'high',
    resources: [
      { name: 'Canva (Free)', url: 'https://canva.com' },
      { name: 'Loom (Free)', url: 'https://loom.com' },
      { name: 'javari Social Graphics', url: 'https://craudiovizai.com/tools/social-graphics' },
    ],
    tips: [
      'Product Hunt recommends a GIF or video',
      'Create multiple sizes for different platforms',
      'Show the product in action, not just logos',
    ],
  },

  // 2 Weeks Before
  {
    id: 'email-list',
    category: 'Email',
    task: 'Build pre-launch email list',
    description: 'Set up email capture and start building anticipation',
    daysBeforeLaunch: 14,
    priority: 'high',
    resources: [
      { name: 'Mailchimp (Free)', url: 'https://mailchimp.com' },
      { name: 'Buttondown (Free)', url: 'https://buttondown.email' },
      { name: 'ConvertKit', url: 'https://convertkit.com' },
    ],
  },
  {
    id: 'ph-prep',
    category: 'Product Hunt',
    task: 'Prepare Product Hunt launch',
    description: 'Set up maker profile, prepare assets, find a hunter',
    daysBeforeLaunch: 14,
    priority: 'high',
    resources: [{ name: 'Product Hunt', url: 'https://producthunt.com' }],
    tips: [
      'Build relationships with hunters before asking',
      'Prepare 5 high-quality images/GIFs',
      'Write a compelling first comment',
      'Schedule for Tuesday-Thursday, 12:01 AM PST',
    ],
  },
  {
    id: 'social-profiles',
    category: 'Social',
    task: 'Set up and optimize social profiles',
    description: 'Create/update Twitter, LinkedIn, and relevant platform profiles',
    daysBeforeLaunch: 14,
    priority: 'medium',
  },
  {
    id: 'beta-testers',
    category: 'Product',
    task: 'Recruit beta testers',
    description: 'Get 10-50 early users to test and provide feedback',
    daysBeforeLaunch: 14,
    priority: 'high',
    resources: [
      { name: 'BetaList', url: 'https://betalist.com' },
      { name: 'Reddit r/startups', url: 'https://reddit.com/r/startups' },
    ],
  },

  // 1 Week Before
  {
    id: 'press-kit',
    category: 'PR',
    task: 'Create press kit',
    description: 'Prepare press release, founder bio, logos, and screenshots',
    daysBeforeLaunch: 7,
    priority: 'medium',
    tips: [
      'Include high-res logo files',
      'Write a 1-paragraph and 3-paragraph description',
      'Have quotes ready from beta testers',
    ],
  },
  {
    id: 'content-queue',
    category: 'Content',
    task: 'Prepare launch content',
    description: 'Write tweets, LinkedIn posts, and email sequences',
    daysBeforeLaunch: 7,
    priority: 'high',
    tips: [
      'Prepare 10+ tweets for launch day',
      'Write 3 different angles for the story',
      'Have email templates ready for outreach',
    ],
  },
  {
    id: 'supporters',
    category: 'Community',
    task: 'Rally your supporters',
    description: 'Notify friends, family, and network about launch date',
    daysBeforeLaunch: 7,
    priority: 'high',
    tips: [
      'Create a private Slack/Discord for supporters',
      'Give specific actions they can take',
      'Make it easy for them to share',
    ],
  },

  // 3 Days Before
  {
    id: 'final-check',
    category: 'Product',
    task: 'Final product check',
    description: 'Test all features, fix critical bugs, check analytics',
    daysBeforeLaunch: 3,
    priority: 'critical',
  },
  {
    id: 'schedule-posts',
    category: 'Social',
    task: 'Schedule social media posts',
    description: 'Queue up launch day posts across all platforms',
    daysBeforeLaunch: 3,
    priority: 'high',
    resources: [
      { name: 'Buffer (Free)', url: 'https://buffer.com' },
      { name: 'Later (Free)', url: 'https://later.com' },
    ],
  },

  // Launch Day
  {
    id: 'ph-launch',
    category: 'Product Hunt',
    task: 'Launch on Product Hunt',
    description: 'Go live and engage with the community all day',
    daysBeforeLaunch: 0,
    priority: 'critical',
    tips: [
      'Be online the entire day',
      'Respond to every comment',
      'Share updates on social media',
      'Thank your supporters',
    ],
  },
  {
    id: 'hn-launch',
    category: 'Hacker News',
    task: 'Post on Hacker News (Show HN)',
    description: 'Share your launch with the HN community',
    daysBeforeLaunch: 0,
    priority: 'high',
    resources: [{ name: 'Hacker News', url: 'https://news.ycombinator.com' }],
    tips: [
      'Post between 9 AM - 12 PM EST',
      'Be authentic and technical',
      'Respond to every comment thoughtfully',
    ],
  },
  {
    id: 'reddit-launch',
    category: 'Reddit',
    task: 'Share on relevant subreddits',
    description: 'Post in r/startups, r/SideProject, and niche subreddits',
    daysBeforeLaunch: 0,
    priority: 'high',
  },
  {
    id: 'email-blast',
    category: 'Email',
    task: 'Send launch email',
    description: 'Email your waitlist and ask for support',
    daysBeforeLaunch: 0,
    priority: 'critical',
  },

  // Post-Launch
  {
    id: 'follow-up',
    category: 'Community',
    task: 'Follow up with supporters',
    description: 'Thank everyone, share results, and collect testimonials',
    daysBeforeLaunch: -1,
    priority: 'high',
  },
  {
    id: 'submit-directories',
    category: 'SEO',
    task: 'Submit to startup directories',
    description: 'List your product on free directories for SEO',
    daysBeforeLaunch: -1,
    priority: 'medium',
    resources: [
      { name: 'AlternativeTo', url: 'https://alternativeto.net' },
      { name: 'SaaSHub', url: 'https://saashub.com' },
      { name: 'Startup Stash', url: 'https://startupstash.com' },
    ],
  },
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const daysToLaunch = parseInt(searchParams.get('daysToLaunch') || '28');

  // Filter launch sites by category
  let launchSites = [...LAUNCH_SITES];
  if (category) {
    launchSites = getLaunchSitesForCategory(category);
  }

  // Filter tasks by timeline
  const relevantTasks = LAUNCH_TASKS.filter(
    (task) => task.daysBeforeLaunch <= daysToLaunch
  ).sort((a, b) => b.daysBeforeLaunch - a.daysBeforeLaunch);

  // Group tasks by phase
  const phases = [
    { name: '4 Weeks Before', minDays: 21, maxDays: 28 },
    { name: '2 Weeks Before', minDays: 8, maxDays: 20 },
    { name: '1 Week Before', minDays: 4, maxDays: 7 },
    { name: '3 Days Before', minDays: 1, maxDays: 3 },
    { name: 'Launch Day', minDays: 0, maxDays: 0 },
    { name: 'Post-Launch', minDays: -7, maxDays: -1 },
  ];

  const groupedTasks = phases.map((phase) => ({
    ...phase,
    tasks: relevantTasks.filter(
      (task) =>
        task.daysBeforeLaunch >= phase.minDays &&
        task.daysBeforeLaunch <= phase.maxDays
    ),
  }));

  // Calculate completion stats
  const totalTasks = relevantTasks.length;
  const criticalTasks = relevantTasks.filter((t) => t.priority === 'critical').length;
  const freeSitesCount = launchSites.length;

  return NextResponse.json({
    success: true,
    checklist: {
      phases: groupedTasks,
      totalTasks,
      criticalTasks,
    },
    launchSites,
    tips: {
      general: [
        'Start building hype 2-4 weeks before launch',
        'Product Hunt launches work best Tuesday-Thursday',
        'Engage authentically on every platform',
        'Quality > Quantity - focus on 3-5 platforms max',
        'Have team/supporters ready to engage on launch day',
      ],
      productHunt: LAUNCH_SITES.find((s) => s.name === 'Product Hunt')?.submissionTips || [],
      hackerNews: LAUNCH_SITES.find((s) => s.name === 'Hacker News (Show HN)')?.submissionTips || [],
    },
    meta: {
      daysToLaunch,
      category,
      freeSitesCount,
      timestamp: new Date().toISOString(),
    },
  });
}

// POST endpoint to generate personalized checklist
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { launchDate, productType, channels, budget } = body;

    // Calculate days to launch
    const launch = new Date(launchDate);
    const today = new Date();
    const daysToLaunch = Math.ceil(
      (launch.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Filter tasks based on timeline
    let tasks = LAUNCH_TASKS.filter(
      (task) => task.daysBeforeLaunch <= daysToLaunch
    );

    // Filter launch sites based on product type
    let sites = getLaunchSitesForCategory(productType || 'saas');

    // If budget is 0, emphasize free resources
    if (budget === 0) {
      tasks = tasks.map((task) => ({
        ...task,
        resources: task.resources?.filter(
          (r) => r.name.toLowerCase().includes('free') || r.name.includes('javari')
        ),
      }));
    }

    // Generate timeline
    const timeline = [];
    for (let day = daysToLaunch; day >= -1; day--) {
      const dayTasks = tasks.filter((t) => t.daysBeforeLaunch === day);
      if (dayTasks.length > 0) {
        const targetDate = new Date(today);
        targetDate.setDate(targetDate.getDate() + (daysToLaunch - day));
        timeline.push({
          daysFromNow: daysToLaunch - day,
          date: targetDate.toISOString().split('T')[0],
          label:
            day === 0
              ? 'Launch Day!'
              : day < 0
              ? `Day ${Math.abs(day)} After Launch`
              : `${day} Days Before`,
          tasks: dayTasks,
        });
      }
    }

    return NextResponse.json({
      success: true,
      launchDate: launchDate,
      daysToLaunch,
      timeline,
      recommendedSites: sites.slice(0, 10),
      urgentTasks: tasks
        .filter((t) => t.priority === 'critical' && t.daysBeforeLaunch <= 7)
        .slice(0, 5),
      meta: {
        totalTasks: tasks.length,
        productType,
        budget,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Launch checklist error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate checklist' },
      { status: 500 }
    );
  }
}
