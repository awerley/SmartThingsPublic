import { NextResponse } from "next/server";
import { ZodError, type ZodSchema } from "zod";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const badRequest = (msg: string) => new HttpError(400, msg);
export const unauthorized = (msg = "Not signed in") => new HttpError(401, msg);
export const forbidden = (msg = "Not allowed") => new HttpError(403, msg);
export const notFound = (msg = "Not found") => new HttpError(404, msg);

export type RouteCtx = { params: Promise<Record<string, string>> };

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

/** Wraps a route handler with uniform error handling. */
export function route(fn: (req: Request, ctx: RouteCtx) => Promise<Response>) {
  return async (req: Request, ctx: RouteCtx) => {
    try {
      return await fn(req, ctx);
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message }, e.status);
      if (e instanceof ZodError) {
        const issue = e.issues[0];
        return json({ error: `${issue.path.join(".") || "input"}: ${issue.message}`, issues: e.issues }, 400);
      }
      console.error(e);
      return json({ error: "Something went wrong" }, 500);
    }
  };
}

export async function parseBody<T>(req: Request, schema: ZodSchema<T>): Promise<T> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw badRequest("Invalid JSON body");
  }
  return schema.parse(body);
}

export function searchParams(req: Request) {
  return new URL(req.url).searchParams;
}
