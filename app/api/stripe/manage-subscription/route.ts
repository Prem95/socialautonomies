import { stripe } from "@/lib/stripe";
import { getURL } from "@/lib/utils";
import { createOrRetrieveCustomer } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  if (req.method === "POST") {
    try {
      const cookieStore = cookies();
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.json(
          { error: "Could not get user" },
          { status: 401 }
        );
      }

      const customer = await createOrRetrieveCustomer({
        uuid: user.id,
        email: user.email || "",
      });

      if (!customer) {
        return NextResponse.json(
          { error: "Could not get customer" },
          { status: 400 }
        );
      }

      const { url } = await stripe.billingPortal.sessions.create({
        customer,
        return_url: `${getURL()}/dashboard`,
      });

      return NextResponse.json({ url });
    } catch (err: any) {
      console.log(err);
      return new Response(err.message, { status: 500 });
    }
  } else {
    return new Response("Method Not Allowed", {
      headers: {
        Allow: "POST",
      },
      status: 405,
    });
  }
} 