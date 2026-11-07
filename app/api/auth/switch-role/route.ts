import { NextResponse } from "next/server";

// Role switching has been removed: the maintenance view now follows the signed-in user's role.
// This file can be deleted.
export async function POST() {
  return NextResponse.json(
    { success: false, message: "Le changement de rôle n'est plus disponible." },
    { status: 410 }
  );
}
