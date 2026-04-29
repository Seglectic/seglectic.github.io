#!/usr/bin/env bash
# KDE Plasma settings backup/restore script
# Usage: ./kcloud.sh --backup [dest_dir]
#        ./kcloud.sh --restore [src_dir]
#        ./kcloud.sh --backup-gist [gist_id] [work_dir]
#        ./kcloud.sh --restore-gist [gist_id] [dest_dir]

set -euo pipefail

resolve_base_dir() {
    local source_path="${BASH_SOURCE[0]:-}"

    if [[ -n "$source_path" && "$source_path" != "bash" && "$source_path" != "-bash" ]]; then
        cd "$(dirname "$source_path")" && pwd
    else
        pwd
    fi
}

SCRIPT_DIR="$(resolve_base_dir)"
DEFAULT_DEST="$SCRIPT_DIR/backup"
DEFAULT_GIST_WORKDIR="$SCRIPT_DIR/.kcloud-gist"
GIST_FILENAME="kcloud-backup.tar.gz.b64"
MANIFEST_FILENAME="kcloud-manifest.json"
README_FILENAME="README.md"

usage() {
    echo "Usage: $0 --backup [dest_dir]"
    echo "       $0 --restore [src_dir]"
    echo "       $0 --backup-gist [gist_id] [work_dir]"
    echo "       $0 --restore-gist [gist_id] [dest_dir]"
    echo ""
    echo "Run without arguments for an interactive prompt."
    echo ""
    echo "  --backup   Copy KDE settings into dest_dir (default: ./backup)"
    echo "  --restore  Restore KDE settings from src_dir (default: ./backup)"
    echo "  --backup-gist   Back up locally, tarball it, base64 it, and upload it to a GitHub gist"
    echo "                  Uses \$KCLOUD_GIST_ID or \$KBACK_GIST_ID, or the provided gist_id"
    echo "  --restore-gist  Download a gist backup, unpack it into dest_dir, then restore from it"
    echo "                  Uses \$KCLOUD_GIST_ID or \$KBACK_GIST_ID, or the provided gist_id"
    exit 1
}

# Files and dirs to back up, relative to HOME
# Each entry: "source_path|description"
CONFIG_FILES=(
    # ── Plasma shell & desktop layout ──────────────────────────────────────
    ".config/plasma-org.kde.plasma.desktop-appletsrc|Plasma desktop panel/widget layout"
    ".config/plasmanotifyrc|Plasma notifications config"
    ".config/plasma-localerc|Locale/region settings"
    ".config/plasmarc|Plasma shell general settings"
    ".config/plasmashellrc|Plasma shell behavior and UI state"
    ".config/plasma-workspace|Plasma workspace env/shutdown scripts"

    # ── Window manager ──────────────────────────────────────────────────────
    ".config/kwinrc|KWin rules, effects, tiling, compositing"
    ".config/kwinrulesrc|KWin window-specific rules"

    # ── Global shortcuts & hotkeys ──────────────────────────────────────────
    ".config/kglobalshortcutsrc|Global keyboard shortcuts"

    # ── Global KDE appearance & fonts ───────────────────────────────────────
    ".config/kdeglobals|Color scheme, fonts, widget style, icon theme"
    ".config/kdedefaults|KDE system defaults overrides"
    ".config/breezerc|Breeze widget and decoration settings"
    ".config/kscreenlockerrc|Screen locker settings"
    ".config/ksplashrc|Splash screen settings"
    ".config/ksmserverrc|Session startup and restore settings"
    ".config/systemsettingsrc|System Settings application preferences"

    # ── Konsole terminal ────────────────────────────────────────────────────
    ".config/konsolerc|Konsole general settings"
    ".config/konsolesshconfig|Konsole SSH bookmarks"
    ".local/share/konsole|Konsole profiles and color schemes"

    # ── Dolphin file manager ────────────────────────────────────────────────
    ".config/dolphinrc|Dolphin general settings"
    ".local/share/dolphin/bookmarks.xml|Dolphin bookmarks"
    ".local/share/dolphin/view_properties|Dolphin per-folder view settings"

    # ── Kate / KWrite editor ────────────────────────────────────────────────
    ".config/katerc|Kate settings"
    ".config/katevirc|Kate vi-mode settings"
    ".config/kate-externaltoolspluginrc|Kate external tools"
    ".config/kate|Kate data dir (LSP, tools)"

    # ── App launcher / search ───────────────────────────────────────────────
    ".config/krunnerrc|KRunner history and enabled plugins"

    # ── Notifications ───────────────────────────────────────────────────────
    ".config/spectaclerc|Spectacle screenshot settings"
    ".config/spectacle.notifyrc|Spectacle notifications"

    # ── System services ─────────────────────────────────────────────────────
    ".config/kded5rc|KDE daemon (kded5) module config"
    ".config/kded6rc|KDE daemon (kded6) module config"
    ".config/kded_device_automounterrc|Device auto-mount rules"
    ".config/kiorc|KIO file transfer settings"
    ".config/baloofilerc|Baloo file indexer settings"
    ".config/baloofileinformationrc|Baloo file info plugin"

    # ── GTK theming (so GTK apps match Plasma) ──────────────────────────────
    ".config/gtk-3.0|GTK3 theme/font settings"
    ".config/gtk-4.0|GTK4 theme/font settings"
    ".config/gtkrc|GTK2 theme settings"
    ".config/gtkrc-2.0|GTK2 alternate theme settings"

    # ── Custom color schemes & look-and-feel ───────────────────────────────
    ".local/share/color-schemes|Custom color schemes"
    ".local/share/plasma/look-and-feel|Custom Plasma themes"
    ".local/share/plasma/wallpapers|Custom/installed wallpaper packages"

    # ── Icons ───────────────────────────────────────────────────────────────
    ".local/share/icons|User-installed icon themes (skip system hicolor)"


    # ── Plasma system monitor ────────────────────────────────────────────────
    ".local/share/plasma-systemmonitor|System Monitor page layouts"

    # ── Custom Plasma widgets ───────────────────────────────────────────────
    ".local/share/plasma/plasmoids|User-installed Plasma widgets"
)

require_command() {
    local cmd="$1"
    command -v "$cmd" >/dev/null 2>&1 || {
        echo "Error: required command '$cmd' is not installed."
        exit 1
    }
}

require_gh_auth() {
    require_command gh
    gh auth status >/dev/null 2>&1 || {
        echo "Error: GitHub CLI is not authenticated."
        echo "Run: gh auth login"
        exit 1
    }
}

resolve_gist_id() {
    local gist_id="${1:-${KCLOUD_GIST_ID:-${KBACK_GIST_ID:-}}}"
    if [[ -z "$gist_id" ]]; then
        echo "Error: no gist id provided."
        echo "Pass a gist id, or set KCLOUD_GIST_ID."
        exit 1
    fi
    printf '%s\n' "$gist_id"
}

create_gist() {
    require_command jq
    require_gh_auth

    gh api gists \
        -f description="KCloud KDE settings backup" \
        -F public=false \
        -F "files[$README_FILENAME][content]=KCloud gist bootstrap" \
        --jq '.id'
}

write_manifest() {
    local dest="$1"
    local created_at
    created_at="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
    cat >"$dest/$MANIFEST_FILENAME" <<EOF
{
  "format": 1,
  "created_at": "$created_at",
  "source": "KCloud",
  "archive_file": "$GIST_FILENAME"
}
EOF
}

write_readme() {
    local dest="$1"
    cat >"$dest/$README_FILENAME" <<EOF
# KCloud gist backup

This gist stores a KDE settings backup produced by KCloud.

- \`$GIST_FILENAME\`: base64-encoded \`.tar.gz\` archive of the backup folder
- \`$MANIFEST_FILENAME\`: basic metadata for the backup
EOF
}

create_archive_from_backup() {
    local backup_dir="$1"
    local work_dir="$2"
    local archive_path="$work_dir/kcloud-backup.tar.gz"
    local encoded_path="$work_dir/$GIST_FILENAME"

    rm -rf "$work_dir"
    mkdir -p "$work_dir"

    tar -C "$backup_dir" -czf "$archive_path" .
    base64 -w 0 "$archive_path" >"$encoded_path"
    write_manifest "$work_dir"
    write_readme "$work_dir"
}

extract_archive_to_dir() {
    local work_dir="$1"
    local dest_dir="$2"
    local archive_path="$work_dir/kcloud-backup.tar.gz"
    local encoded_path="$work_dir/$GIST_FILENAME"

    [[ -f "$encoded_path" ]] || {
        echo "Error: gist backup file '$GIST_FILENAME' was not found."
        exit 1
    }

    mkdir -p "$dest_dir"
    base64 -d "$encoded_path" >"$archive_path"
    tar -C "$dest_dir" -xzf "$archive_path"
}

do_backup() {
    local dest="$1"
    echo "Backing up KDE Plasma settings to: $dest"
    echo ""

    local backed=0
    local skipped=0

    for entry in "${CONFIG_FILES[@]}"; do
        local src_rel="${entry%%|*}"
        local desc="${entry##*|}"
        local src="$HOME/$src_rel"
        local dst="$dest/$src_rel"

        if [[ -e "$src" ]]; then
            mkdir -p "$(dirname "$dst")"
            cp -a "$src" "$dst"
            echo "  [OK] $src_rel  ($desc)"
            (( backed++ )) || true
        else
            echo "  [--] $src_rel  (not found, skipped)"
            (( skipped++ )) || true
        fi
    done

    echo ""
    echo "Done. $backed items backed up, $skipped not present."
    echo "Backup location: $dest"
}

do_restore() {
    local src="$1"

    if [[ ! -d "$src" ]]; then
        echo "Error: restore source '$src' does not exist."
        exit 1
    fi

    echo "Restoring KDE Plasma settings from: $src"
    echo "WARNING: This will overwrite your current settings."
    prompt_text "Continue? [y/N] " confirm
    [[ "$confirm" =~ ^[Yy]$ ]] || { echo "Aborted."; exit 0; }
    echo ""

    local restored=0
    local skipped=0

    for entry in "${CONFIG_FILES[@]}"; do
        local rel="${entry%%|*}"
        local desc="${entry##*|}"
        local backed_up="$src/$rel"
        local dst="$HOME/$rel"

        if [[ -e "$backed_up" ]]; then
            mkdir -p "$(dirname "$dst")"
            # Back up existing before overwriting
            [[ -e "$dst" ]] && cp -a "$dst" "${dst}.kcloud-pre-restore.bak" 2>/dev/null || true
            cp -a "$backed_up" "$dst"
            echo "  [OK] $rel  ($desc)"
            (( restored++ )) || true
        else
            echo "  [--] $rel  (not in backup, skipped)"
            (( skipped++ )) || true
        fi
    done

    echo ""
    echo "Done. $restored items restored, $skipped not in backup."
    echo ""
    echo "To apply changes, log out and back in, or run:"
    echo "  kquitapp6 plasmashell && kstart plasmashell &"
}

upload_gist_backup() {
    local gist_id="$1"
    local work_dir="$2"

    require_gh_auth

    echo "Uploading backup to gist: $gist_id"
    gh api \
        -X PATCH \
        "gists/$gist_id" \
        -F "files[$GIST_FILENAME][content]=@$work_dir/$GIST_FILENAME" \
        -F "files[$MANIFEST_FILENAME][content]=@$work_dir/$MANIFEST_FILENAME" \
        -F "files[$README_FILENAME][content]=@$work_dir/$README_FILENAME" \
        --silent
    echo "Gist upload complete."
}

download_gist_backup() {
    local gist_id="$1"
    local work_dir="$2"

    require_command jq
    require_gh_auth

    rm -rf "$work_dir"
    mkdir -p "$work_dir"

    echo "Downloading gist backup: $gist_id"
    gh api "gists/$gist_id" | jq -r --arg file "$GIST_FILENAME" '.files[$file].content // empty' >"$work_dir/$GIST_FILENAME"

    if [[ ! -s "$work_dir/$GIST_FILENAME" ]]; then
        echo "Error: gist '$gist_id' does not contain '$GIST_FILENAME'."
        exit 1
    fi

    gh api "gists/$gist_id" | jq -r --arg file "$MANIFEST_FILENAME" '.files[$file].content // empty' >"$work_dir/$MANIFEST_FILENAME" || true
}

do_backup_gist() {
    local gist_id="${1:-}"
    local work_dir="$2"
    local backup_dir="${work_dir%/}.backup"

    require_command tar
    require_command base64

    if [[ -z "$gist_id" ]]; then
        echo "No gist id provided. Creating a new private gist..."
        gist_id="$(create_gist)"
        echo "Created gist: $gist_id"
        echo "Tip: export KCLOUD_GIST_ID=$gist_id"
    fi

    rm -rf "$backup_dir"
    do_backup "$backup_dir"
    create_archive_from_backup "$backup_dir" "$work_dir"
    upload_gist_backup "$gist_id" "$work_dir"
    rm -rf "$backup_dir"
    echo "Local working files: $work_dir"
}

do_restore_gist() {
    local gist_id="$1"
    local dest_dir="$2"
    local work_dir="$DEFAULT_GIST_WORKDIR"

    require_command tar
    require_command base64

    download_gist_backup "$gist_id" "$work_dir"
    mkdir -p "$dest_dir"
    extract_archive_to_dir "$work_dir" "$dest_dir"
    do_restore "$dest_dir"
}

require_tty() {
    [[ -r /dev/tty ]] || {
        echo "Error: interactive mode requires a TTY."
        echo "Run with explicit flags, or execute the script from a terminal."
        exit 1
    }
}

prompt_text() {
    local prompt="$1"
    local __var_name="$2"
    local input

    if [[ -r /dev/tty ]]; then
        read -r -p "$prompt" input </dev/tty
    else
        read -r -p "$prompt" input
    fi

    printf -v "$__var_name" '%s' "$input"
}

prompt_with_default() {
    local prompt="$1"
    local default_value="$2"
    local __var_name="$3"
    local reply

    prompt_text "$prompt [$default_value] " reply
    if [[ -z "$reply" ]]; then
        reply="$default_value"
    fi

    printf -v "$__var_name" '%s' "$reply"
}

prompt_menu() {
    local __var_name="$1"
    local prompt="$2"
    shift 2
    local options=("$@")
    local choice

    while true; do
        echo "$prompt"
        for i in "${!options[@]}"; do
            printf '  %d) %s\n' "$((i + 1))" "${options[$i]}"
        done
        prompt_text "Select an option: " choice
        if [[ "$choice" =~ ^[1-9][0-9]*$ ]] && (( choice >= 1 && choice <= ${#options[@]} )); then
            printf -v "$__var_name" '%s' "${options[$((choice - 1))]}"
            return 0
        fi
        echo "Please enter a valid number."
    done
}

interactive_main() {
    local action
    local storage
    local gist_id=""
    local dest_dir=""
    local work_dir=""
    local summary_gist=""

    require_tty

    echo "KCloud interactive setup"
    echo ""

    prompt_menu action "What would you like to do?" "Backup settings" "Restore settings"
    echo ""
    prompt_menu storage "Where should KCloud work with the backup?" "Local folder" "GitHub gist"
    echo ""

    case "$action|$storage" in
        "Backup settings|Local folder")
            prompt_with_default "Backup destination directory:" "$DEFAULT_DEST" dest_dir
            MODE="--backup"
            TARGET="$dest_dir"
            ;;
        "Backup settings|GitHub gist")
            prompt_text "Existing gist ID (leave blank to create a new private gist): " gist_id
            prompt_with_default "Local staging directory:" "$DEFAULT_GIST_WORKDIR" work_dir
            MODE="--backup-gist"
            TARGET="$gist_id"
            EXTRA_TARGET="$work_dir"
            summary_gist="${gist_id:-new private gist}"
            ;;
        "Restore settings|Local folder")
            prompt_with_default "Restore source directory:" "$DEFAULT_DEST" dest_dir
            MODE="--restore"
            TARGET="$dest_dir"
            ;;
        "Restore settings|GitHub gist")
            prompt_text "Gist ID to restore from: " gist_id
            [[ -n "$gist_id" ]] || gist_id="${KCLOUD_GIST_ID:-${KBACK_GIST_ID:-}}"
            [[ -n "$gist_id" ]] || {
                echo "A gist ID is required for restore."
                exit 1
            }
            prompt_with_default "Local extraction directory:" "$DEFAULT_DEST" dest_dir
            MODE="--restore-gist"
            TARGET="$gist_id"
            EXTRA_TARGET="$dest_dir"
            summary_gist="$gist_id"
            ;;
    esac

    echo ""
    echo "About to run:"
    case "$MODE" in
        --backup)
            echo "  Action: local backup"
            echo "  Destination: $TARGET"
            ;;
        --restore)
            echo "  Action: local restore"
            echo "  Source: $TARGET"
            ;;
        --backup-gist)
            echo "  Action: gist backup"
            echo "  Gist: $summary_gist"
            echo "  Staging directory: $EXTRA_TARGET"
            ;;
        --restore-gist)
            echo "  Action: gist restore"
            echo "  Gist: $summary_gist"
            echo "  Extraction directory: $EXTRA_TARGET"
            ;;
    esac
    echo ""
    prompt_text "Proceed? [y/N] " confirm
    [[ "$confirm" =~ ^[Yy]$ ]] || { echo "Aborted."; exit 0; }
    echo ""
}

MODE="${1:-}"
TARGET="${2:-}"
EXTRA_TARGET="${3:-}"

if [[ $# -eq 0 ]]; then
    interactive_main
fi

case "$MODE" in
    --backup)
        TARGET="${TARGET:-$DEFAULT_DEST}"
        do_backup "$TARGET"
        ;;
    --restore)
        TARGET="${TARGET:-$DEFAULT_DEST}"
        do_restore "$TARGET"
        ;;
    --backup-gist)
        GIST_ID="${TARGET:-${KCLOUD_GIST_ID:-${KBACK_GIST_ID:-}}}"
        WORK_DIR="${EXTRA_TARGET:-$DEFAULT_GIST_WORKDIR}"
        do_backup_gist "$GIST_ID" "$WORK_DIR"
        ;;
    --restore-gist)
        GIST_ID="$(resolve_gist_id "${TARGET:-}")"
        DEST_DIR="${EXTRA_TARGET:-$DEFAULT_DEST}"
        do_restore_gist "$GIST_ID" "$DEST_DIR"
        ;;
    *) usage ;;
esac
