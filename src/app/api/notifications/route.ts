import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/db';
import Notification from '@/models/Notification';
import User from '@/models/User';
import { authOptions } from '@/lib/auth';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    let notifications = await Notification.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(20);

    // Seed some notifications if none exist for a better experience
    if (notifications.length === 0) {
      const seedData = [
        {
          userId: user._id,
          icon: 'Brain',
          title: 'Welcome to Brainhire AI',
          description: 'Start by posting a job or exploring candidates.',
          type: 'info',
          read: false,
        },
        {
          userId: user._id,
          icon: 'CheckCircle',
          title: 'Account Verified',
          description: 'Your recruiter account has been successfully verified.',
          type: 'success',
          read: true,
        }
      ];
      await Notification.insertMany(seedData);
      notifications = await Notification.find({ userId: user._id }).sort({ createdAt: -1 });
    }

    const formattedNotifications = notifications.map((n: any) => ({
      id: n._id.toString(),
      icon: n.icon,
      title: n.title,
      description: n.description,
      time: formatTime(n.createdAt),
      type: n.type,
      read: n.read,
      link: n.link,
    }));

    return NextResponse.json({
      success: true,
      data: formattedNotifications,
      unreadCount: notifications.filter(n => !n.read).length
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

        await dbConnect();
        const user = await User.findOne({ email: session.user.email });
        if (!user) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });

        const body = await req.json();
        const notification = await Notification.create({
            ...body,
            userId: user._id
        });

        return NextResponse.json({ success: true, data: notification }, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}

function formatTime(date: Date): string {
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
  if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d ago`;
  return format(date, 'MMM d');
}

