import { connectDB } from "@/lib/mongodb";

export default async function DatabaseCheckPage() {
  try {
    await connectDB();

    return (
      <main style={{ padding: "2rem" }}>
        <h1>HomeCheck Database Check</h1>
        <p>✅ MongoDB connected successfully!</p>
      </main>
    );
  } catch (error) {
    console.error("MongoDB connection failed:", error);

    return (
      <main style={{ padding: "2rem" }}>
        <h1>HomeCheck Database Check</h1>
        <p>❌ Could not connect to MongoDB.</p>
        <p>Check your terminal for the error details.</p>
      </main>
    );
  }
}
