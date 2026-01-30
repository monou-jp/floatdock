# floatdock

Tiny CTA widget for existing websites.

`floatdock` は、既存のウェブサイトに 1 行のスクリプトタグを追加するだけで、フローティングボタンやボトムバーなどの CTA（Call To Action）UI を表示できる軽量な JavaScript ライブラリです。

## 特徴

- **1 ファイルで完結**: 依存ライブラリなし、設定込みで 1 ファイルの JavaScript を読み込むだけ。
- **マルチデバイス対応**: PC ではフローティング、スマホではボトムバーや拡張 FAB など、デバイスごとに最適な表示を選択可能。
- **スクロール追従**: スクロールに合わせて表示・非表示を切り替え可能（設定で変更可）。
- **カスタマイズ性**: 色、アイコン、リンク先、表示位置などを詳細に設定可能。

## 使い方

1. `floatdock.js` を自身のサーバーにアップロードします。
2. 表示させたい HTML の `<body>` 終了タグ直前などで読み込みます。

```html
<script src="path/to/floatdock.js" defer></script>
```

設定を変更する場合は、`floatdock.js` 内部の `CONFIG` オブジェクトを直接編集するか、`window.FLOATDOCK_CONFIG` を定義してください。

## デモ

以下のURLより、実際の動作を確認できるデモページをご覧いただけます。

[https://monou-jp.github.io/floatdock/](https://monou-jp.github.io/floatdock/)


ローカルで確認する場合は、`docs/index.html` をブラウザで開いてください。

## 機能・設定の詳細

### 表示モード
デバイスごとに以下の表示モードを選択できます。

- **PC (Desktop)**:
  - `floating`: 画面端に常駐するフローティングボタン
- **スマートフォン (Mobile)**:
  - `bottom-bar`: 画面下部に固定されるボタンバー
  - `floating`: 画面端の丸型/角丸ボタン
  - `expand-fab`: タップするとメニューが展開するアクションボタン

### スクロール時の挙動
- **スクロールで隠す**: 下スクロール（または上スクロール）時にウィジェットを自動的に隠し、コンテンツの閲覧を邪魔しません。
- **最上部で表示**: ページ最上部では必ず表示させるといった設定が可能です。

### 設定方法
`floatdock.js` 内の `CONFIG` オブジェクトを直接編集するか、スクリプトを読み込む前に `window.FLOATDOCK_CONFIG` を定義することで上書き設定が可能です。

```javascript
window.FLOATDOCK_CONFIG = {
    lineUrl: "https://lin.ee/your-id",
    contactUrl: "/contact",
    display: {
        mobile: "expand-fab"
    }
};
```

主な設定項目：
- `zIndex`: ウィジェットの重なり順
- `breakpoint`: スマホとPCを切り替える画面幅
- `hideOnScroll`: スクロール追随設定（有効/無効、方向、アニメーション速度など）
- `theme`: シャドウや角丸などの共通デザイン設定

## 制作

**門王 (monou.jp)**
URL: [https://monou.jp](https://monou.jp)

このような JavaScript ツールやウィジェットの制作依頼も受け付けております。お気軽にご連絡ください。

## ライセンス

BSD 3-Clause License
