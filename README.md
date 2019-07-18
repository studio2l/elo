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

실행을 위해서는 SITE_ROOT 와 SHOW_ROOT 환경변수가 필요합니다.
자세한 정보는 아래 설정 부분에 있습니다.

```bash
$ mkdir $HOME/show
$ SITE_ROOT=example SHOW_ROOT=$HOME/show npm start
```

## 배포

```bash
$ yarn build
```

이렇게 하면 dist 폴더에 해당 OS에 대한 설치 파일이 생깁니다.

## 설정

### 환경변수

#### SITE_ROOT

elo는 해당 사이트의 구조를 $SITE_ROOT/site.json 에서 불러오고
$SITE_ROOT/runner안의 셸 파일을 이용해 프로그램을 엽니다.
샘플 파일들이 레포지터리의 example 디렉토리 안에 존재하니
$SITE_ROOT에 복사하고, 각 스튜디오에 맞는 설정으로 수정해주세요.

#### SHOW_ROOT

$SHOW_ROOT는 각 쇼의 데이터를 저장하고 불러오는 장소입니다.
