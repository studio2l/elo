# elo

elo는 투엘의 씬 오프너입니다.

# 설치

elo는 node.js 10.15.3 버전을 사용하여 만들어지고 있습니다. `https://nodejs.org/` 에서 node.js를 설치하세요.

그 후 다음처럼 터미널 명령어를 이용하여 elo를 설치할 수 있습니다.

```bash
$ git clone https://github.com/studio2l/elo
$ cd elo
$ npm install
```

# 실행

```bash
$ npm start
```

# 배포

```bash
# electron은 yarn을 이용한 배포를 추천하고 있습니다.
# 아래 명령을 통해 yarn을 설치할 수 있습니다.
# npm install --global yarn
$ yarn build
```

이렇게 하면 dist 폴더에 해당 OS에 대한 설치 파일이 생깁니다.
