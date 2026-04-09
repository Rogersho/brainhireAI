import { MongoClient } from 'mongodb';
import fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf8');
const mongoUri = envContent.match(/MONGODB_URI=(.*)/)?.[1]?.trim();

async function seedData() {
  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db();
  
  // Update Roger
  await db.collection('applicants').updateOne(
    { name: /Roger/i },
    { 
      $set: { 
        experience: "Senior Software Engineer with 8 years of experience in React, Node.js, and Cloud Architecture. Led teams at Umurava and Google.",
        skills: ["React", "Node.js", "MongoDB", "TypeScript", "AWS"],
        role: "Software Engineer"
      } 
    }
  );

  // Update Kwizera
  await db.collection('applicants').updateOne(
    { name: /Kwizera/i },
    { 
      $set: { 
        experience: "Junior Developer recently graduated from University. Proficient in HTML, CSS, and basic JavaScript. Passionate about AI.",
        skills: ["HTML", "CSS", "JavaScript"],
        role: "Software Engineer"
      } 
    }
  );

  console.log("Seed data updated for Roger and Kwizera.");
  await client.close();
}

seedData();
