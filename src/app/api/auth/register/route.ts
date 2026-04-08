import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const { name, email, password, role } = await req.json();

    if (!name || !email || !password || !role) {
      return NextResponse.json({ success: false, error: 'All fields are required.' }, { status: 400 });
    }

    await dbConnect();
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ success: false, error: 'Email is already registered.' }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userRole = role === "Recruiter" ? "Recruiter" : "Candidate";

    await User.create({
      name,
      email,
      password: hashedPassword,
      role: userRole
    });

    return NextResponse.json({ success: true, message: 'User registered successfully.' }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
