// configDir는 Go의 os.UserConfigDir을 따라 만든 함수이다.
// 다만 에러가 났을 때 두번째 값으로 반환하지 않고 에러를 던진다.
// 현재는 윈도우즈, 리눅스, OSX만 지원한다.
exports.configDir = function() {
	let platform = process.platform;
	let env = process.env;

	if (platform == "win32") {
		let dir = env.AppData;
		if (!dir) {
			throw Error("%AppData% is not defined");
		}
		return dir;
	}
	if (platform == "linux") {
		let dir = env.XDG_CONFIG_HOME;
		if (!dir) {
			dir = env.HOME;
			if (!dir) {
				throw Error("neither $XDG_CONFIG_HOME nor $HOME are defined");
			}
			dir += "/.config";
		}
		return dir;
	}
	if (platform == "darwin") {
		let dir = env.HOME;
		if (!dir) {
			throw Error("$HOME is not defined");
		}
		dir += "/Library/Preferences";
		return dir;
	}

	throw Error("os not supported yet: " +  platform);
}
