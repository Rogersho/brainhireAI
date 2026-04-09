import { MongoClient } from 'mongodb';
import fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf8');
const mongoUri = envContent.match(/MONGODB_URI=(.*)/)?.[1]?.trim();

async function checkData() {
  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db();
  const applicants = await db.collection('applicants').find({}).toArray();
  console.log(JSON.stringify(applicants, null, 2));
  await client.close();
}

checkData();
