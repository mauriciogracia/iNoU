import { broadcastMultiPlatform } from "./socialBroadcastEngine";
import { getProjectPaths, loadState } from "./context";

export function runSocialCommand(
  args: string[],
  rootDir: string = process.cwd(),
): void {
  const sub = args[0]?.toLowerCase() || "list";
  const paths = getProjectPaths(rootDir);
  const state = loadState(paths.statePath);
  const socialConfigs = state.socialNetworkConfigurations || [];

  if (sub === "list") {
    console.log(
      "\x1b[36m%s\x1b[0m",
      "=== iNoU Multi-Platform Social Broadcast Engine Integration ===\n",
    );

    if (socialConfigs.length === 0) {
      console.log("No social network configurations found.");
      console.log(
        "Use: sn add <network> <configurationName> [--account <handle>]",
      );
      console.log("Supported networks: instagram, tiktok, facebook, linkedin");
      return;
    }

    console.log("Configured social network profiles:");
    socialConfigs.forEach((item, index) => {
      const handle = item.accountHandle || "n/a";
      const enabled = item.isEnabled ? "yes" : "no";
      console.log(
        `  ${index + 1}. \x1b[1m${item.configurationName}\x1b[0m -> network=${item.network}, account=${handle}, enabled=${enabled}`,
      );
    });

    console.log(
      `\nUsage: social broadcast --message <Msg> [--platforms instagram,tiktok,facebook,linkedin]`,
    );
    return;
  }

  if (sub === "broadcast" || sub === "post") {
    let message = "";
    let platformsInput = "";

    for (let i = 1; i < args.length; i++) {
      if (args[i] === "--message" && args[i + 1]) message = args[i + 1];
      if (args[i] === "--platforms" && args[i + 1])
        platformsInput = args[i + 1];
    }

    if (!message && args[1] && !args[1].startsWith("-")) message = args[1];

    if (!message) {
      console.log(
        "\x1b[33m%s\x1b[0m",
        "Usage: social broadcast --message <MessageText> [--platforms instagram,tiktok,facebook,linkedin]",
      );
      return;
    }

    const targetPlatforms = platformsInput
      ? platformsInput.split(",").map((p) => p.trim())
      : socialConfigs
        .filter((item) => item.isEnabled)
        .map((item) => item.network);

    if (targetPlatforms.length === 0) {
      console.log(
        "\x1b[33m%s\x1b[0m",
        'No enabled social network configurations. Use "sn add" and enable at least one profile.',
      );
      return;
    }

    broadcastMultiPlatform(message, targetPlatforms, rootDir);
    return;
  }

  console.log(
    'Unknown subcommand for social. Supported: "social list", "social broadcast --message <Msg>"',
  );
}
