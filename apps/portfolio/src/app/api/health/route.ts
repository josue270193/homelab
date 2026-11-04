// Liveness probe for the Docker HEALTHCHECK and Uptime Kuma (#71).
export function GET() {
  return Response.json({ status: "UP" });
}
