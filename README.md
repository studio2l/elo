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

elo를 사용하기 위해서는 `SITE_ROOT` 환경변수를 정의해야 합니다.

$SITE_ROOT/show가 생성되는 쇼의 루트가 됩니다.

elo는 해당 사이트의 구조를 $SITE_ROOT/site.json 에서 불러옵니다.
테스트를 위해서는 example/site.json을 복사해서 $SITE_ROOT에 넣어주세요.

elo는 특정 프로그램 씬을 생성하거나 열기 위해
$SITE_ROOT/runner안의 셸(배치) 파일을 사용합니다.

해당 셸의 예제 파일은 레포지터리 안의 example/runner 폴더에 있으니 복사하시어
사이트에 맞게 수정하면 됩니다.
