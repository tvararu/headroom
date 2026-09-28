export const APP_ID = "org.vararu.headroom";

// Where webOS installs developer apps. Installing replaces this directory.
export const APP_DIR = `/media/developer/apps/usr/palm/applications/${APP_ID}`;

export const TV_ENV = "HEADROOM_TV";

export function missingTvMessage(): string {
  return `headroom: ${TV_ENV} is not set. Set it to the TV's ssh host (a ~/.ssh/config alias or user@host), e.g. in mise.local.toml; see mise.local.toml.example.`;
}
