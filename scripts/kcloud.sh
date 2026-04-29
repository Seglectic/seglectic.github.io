#!/usr/bin/env bash
# KDE Plasma settings backup/restore script
# Usage: ./kcloud.sh --backup [dest_dir]
#        ./kcloud.sh --restore [src_dir]
#        ./kcloud.sh --backup-gist [backup_name] [work_dir]
#        ./kcloud.sh --restore-gist [backup_name] [dest_dir]

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
    echo "       $0 --backup-gist [backup_name] [work_dir]"
    echo "       $0 --restore-gist [backup_name] [dest_dir]"
    echo ""
    echo "Run without arguments for an interactive prompt."
    echo ""
    echo "  --backup   Copy KDE settings into dest_dir (default: ./backup)"
    echo "  --restore  Restore KDE settings from src_dir (default: ./backup)"
    echo "  --backup-gist   Back up locally, tarball it, base64 it, and upload it to a GitHub gist"
    echo "                  Uses the provided backup_name, or \$KCLOUD_GIST_NAME / \$KBACK_GIST_NAME"
    echo "  --restore-gist  Download a gist backup, unpack it into dest_dir, then restore from it"
    echo "                  Uses the provided backup_name, or lists your KCloud backups if omitted"
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

kcloud_backup_name_default() {
    local host_name
    host_name="$(hostname -s 2>/dev/null || true)"
    printf '%s\n' "${host_name:-default}"
}

list_kcloud_backups_json() {
    require_command jq
    require_gh_auth

    gh api gists --paginate | jq --arg archive "$GIST_FILENAME" --arg manifest "$MANIFEST_FILENAME" '
        [
          .[]
          | select((.files[$archive] != null) and (.files[$manifest] != null))
          | {
              id: .id,
              name: (if (.description // "") == "" then "(unnamed)" else .description end),
              description: (.description // ""),
              updated_at: .updated_at
            }
        ]
    '
}

list_kcloud_backups() {
    local backups_json
    backups_json="$(list_kcloud_backups_json)"

    if [[ "$(jq 'length' <<<"$backups_json")" == "0" ]]; then
        echo "No KCloud backups were found in your gists."
        return 1
    fi

    jq -r '.[] | "\(.name)\t\(.updated_at)\t\(.id)"' <<<"$backups_json"
}

resolve_backup_name() {
    local backup_name="${1:-${KCLOUD_GIST_NAME:-${KBACK_GIST_NAME:-}}}"

    if [[ -n "$backup_name" ]]; then
        printf '%s\n' "$backup_name"
    else
        kcloud_backup_name_default
    fi
}

resolve_gist_id_by_name() {
    local gist_ref="$1"
    local backups_json
    local match_count
    local resolved_id

    if [[ -z "$gist_ref" ]]; then
        echo "Error: no backup name provided."
        echo "Pass a backup name, or set KCLOUD_GIST_NAME."
        exit 1
    fi

    if [[ "$gist_ref" =~ ^[0-9a-fA-F]{20,}$ ]]; then
        printf '%s\n' "$gist_ref"
        return 0
    fi

    backups_json="$(list_kcloud_backups_json)"
    match_count="$(jq --arg name "$gist_ref" '[.[] | select(.description == $name)] | length' <<<"$backups_json")"

    if [[ "$match_count" == "1" ]]; then
        resolved_id="$(jq -r --arg name "$gist_ref" '.[] | select(.description == $name) | .id' <<<"$backups_json")"
        printf '%s\n' "$resolved_id"
        return 0
    fi

    if [[ "$match_count" == "0" ]]; then
        echo "Error: no KCloud backup named '$gist_ref' was found."
    else
        echo "Error: multiple KCloud backups named '$gist_ref' were found."
    fi
    echo ""
    echo "Available KCloud backups:"
    list_kcloud_backups || true
    exit 1
}

create_gist() {
    local backup_name="$1"

    require_command jq
    require_gh_auth

    gh api gists \
        -f description="$backup_name" \
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
    local gist_json
    local backup_raw_url

    require_command jq
    require_gh_auth
    require_command curl

    rm -rf "$work_dir"
    mkdir -p "$work_dir"

    echo "Downloading gist backup: $gist_id"
    gist_json="$(gh api "gists/$gist_id")"
    backup_raw_url="$(jq -r --arg file "$GIST_FILENAME" '.files[$file].raw_url // empty' <<<"$gist_json")"

    if [[ -n "$backup_raw_url" ]]; then
        curl -fsSL "$backup_raw_url" >"$work_dir/$GIST_FILENAME"
    else
        jq -r --arg file "$GIST_FILENAME" '.files[$file].content // empty' <<<"$gist_json" >"$work_dir/$GIST_FILENAME"
    fi

    if [[ ! -s "$work_dir/$GIST_FILENAME" ]]; then
        echo "Error: gist '$gist_id' does not contain '$GIST_FILENAME'."
        exit 1
    fi

    jq -r --arg file "$MANIFEST_FILENAME" '.files[$file].content // empty' <<<"$gist_json" >"$work_dir/$MANIFEST_FILENAME" || true
}

do_backup_gist() {
    local backup_name
    local gist_id=""
    local work_dir="$2"
    local backup_dir="${work_dir%/}.backup"

    require_command tar
    require_command base64

    backup_name="$(resolve_backup_name "${1:-}")"

    if gist_id="$(resolve_gist_id_by_name "$backup_name" 2>/dev/null)"; then
        echo "Using existing KCloud backup: $backup_name"
    else
        echo "No KCloud backup named '$backup_name' found. Creating a new private gist..."
        gist_id="$(create_gist "$backup_name")"
        echo "Created gist for backup: $backup_name"
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

select_backup_name_interactive() {
    local backups_json
    local options=()
    local values=()
    local selected_label
    local idx

    backups_json="$(list_kcloud_backups_json)"
    if [[ "$(jq 'length' <<<"$backups_json")" == "0" ]]; then
        echo "No KCloud backups were found in your gists."
        exit 1
    fi

    while IFS=$'\t' read -r name updated_at; do
        options+=("$name ($updated_at)")
        values+=("$name")
    done < <(jq -r '.[] | "\(.name)\t\(.updated_at)"' <<<"$backups_json")

    prompt_menu selected_label "Choose a KCloud backup to restore:" "${options[@]}"
    for idx in "${!options[@]}"; do
        if [[ "${options[$idx]}" == "$selected_label" ]]; then
            printf '%s\n' "${values[$idx]}"
            return 0
        fi
    done

    echo "Error: failed to resolve selected backup."
    exit 1
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

    if [[ -t 0 && -r /dev/tty ]]; then
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
    local backup_name=""
    local dest_dir=""
    local work_dir=""
    local summary_backup=""

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
            prompt_with_default "Backup name:" "$(resolve_backup_name "")" backup_name
            prompt_with_default "Local staging directory:" "$DEFAULT_GIST_WORKDIR" work_dir
            MODE="--backup-gist"
            TARGET="$backup_name"
            EXTRA_TARGET="$work_dir"
            summary_backup="$backup_name"
            ;;
        "Restore settings|Local folder")
            prompt_with_default "Restore source directory:" "$DEFAULT_DEST" dest_dir
            MODE="--restore"
            TARGET="$dest_dir"
            ;;
        "Restore settings|GitHub gist")
            backup_name="$(select_backup_name_interactive)"
            prompt_with_default "Local extraction directory:" "$DEFAULT_DEST" dest_dir
            MODE="--restore-gist"
            TARGET="$backup_name"
            EXTRA_TARGET="$dest_dir"
            summary_backup="$backup_name"
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
            echo "  Backup name: $summary_backup"
            echo "  Staging directory: $EXTRA_TARGET"
            ;;
        --restore-gist)
            echo "  Action: gist restore"
            echo "  Backup name: $summary_backup"
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
        GIST_ID="${TARGET:-${KCLOUD_GIST_NAME:-${KBACK_GIST_NAME:-}}}"
        WORK_DIR="${EXTRA_TARGET:-$DEFAULT_GIST_WORKDIR}"
        do_backup_gist "$GIST_ID" "$WORK_DIR"
        ;;
    --restore-gist)
        if [[ -n "${TARGET:-}" ]]; then
            GIST_ID="$(resolve_gist_id_by_name "$TARGET")"
        else
            echo "Available KCloud backups:"
            list_kcloud_backups || exit 1
            echo ""
            echo "Run again with one of the backup names above:"
            echo "  $0 --restore-gist <backup_name> [dest_dir]"
            exit 1
        fi
        DEST_DIR="${EXTRA_TARGET:-$DEFAULT_DEST}"
        do_restore_gist "$GIST_ID" "$DEST_DIR"
        ;;
    *) usage ;;
esac
