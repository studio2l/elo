set SITE_NUKE_PATH=%SITE_ROOT%/global/nuke
set NUKE_PATH=%NUKE_PATH%;%SITE_NUKE_PATH%

nuke --nukex %1
