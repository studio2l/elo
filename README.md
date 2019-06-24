# elo

elo는 투엘의 씬 오프너입니다.

<img src="https://raw.githubusercontent.com/studio2l/elo/master/asset/elo.png" width="480"></img>

## 설치

elo는 node.js 10.15.3 버전을 사용하여 만들어지고 있습니다. `https://nodejs.org/` 에서 node.js를 설치하세요.

그 후 다음처럼 터미널 명령어를 이용하여 elo를 설치할 수 있습니다.

```bash
$ git clone https://github.com/studio2l/elo
$ cd elo
$ npm install
```

추가적으로 개발을 위해 필요한 프로그램을 설치합니다. 일반적으로 루트 권한이 필요합니다.

```bash
# npm install --global typescript
# npm install --global yarn
```

## 실행

```bash
$ npm start
```

## 배포

```bash
$ yarn build
```

이렇게 하면 dist 폴더에 해당 OS에 대한 설치 파일이 생깁니다.

## 설정

### $SITE_ROOT

elo를 사용하기 위해서는 `SITE_ROOT` 환경변수를 정의해야 합니다.

기본적으로는 $SITE_ROOT/show 아래에 쇼 디렉토리가 생성 됩니다. 만일 이 장소를
사이트 루트와 분리하고 싶다면 아래의 SHOW_ROOT 환경변수 섹션를 참고하세요.

elo는 해당 사이트의 구조를 $SITE_ROOT/site.json 에서 불러오고
$SITE_ROOT/runner안의 셸 파일을 이용해 프로그램을 엽니다.

해당 파일들은 example 디렉토리 안에 존재하니 $SITE_ROOT에 복사해서 넣어주세요.
리눅스에서는 다음처럼 하시면 됩니다.

```
cp -r example/* $SITE_ROOT
```

### $SHOW_ROOT

사이트 루트와 쇼의 루트를 분리하고 싶을 때`SHOW_ROOT` 환경변수를 사용합니다.

예를 들어 개발용 사이트 루트와 쇼 루트를 분리할 때 사용할 수 있습니다.
