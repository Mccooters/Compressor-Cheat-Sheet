import { Client } from "@microsoft/microsoft-graph-client";
import { auth } from "@/auth";

export async function getGraphClient(): Promise<Client> {
  const session = await auth();
  if (!session?.accessToken) {
    throw new Error(
      "Not signed in with Microsoft — SharePoint access requires an active Microsoft session."
    );
  }

  return Client.init({
    authProvider: (done) => {
      done(null, session.accessToken as string);
    },
  });
}
