//拡張後のプラグインのオプション型を定義 
type LegendLikeTextAlign = 'left' | 'right';
type LegendLikeTextPosition = 'top' | 'bottom';

// タイトル風テキスト表示
export interface LegendLikeTextOptions {
  /** 表示する行（上からの順） */
  lines?: string[];
  /** 文字色 */
  color?: string;
  /** フォント */
  font?: {
    size?: number;
    weight?: string; // 'normal' | 'bold' など
    family?: string; // 追加: 任意フォント（デフォルトは sans-serif）
  };
  /** 行間（px）。未指定なら size+4 */
  lineHeight?: number;
  /** 右寄せ/左寄せ（textAlign に反映） */
  align?: LegendLikeTextAlign;
  /** 上側/下側（textBaseline の初期値と積み上げ方向に影響） */
  position?: LegendLikeTextPosition;
  /** 余白（従来の外側配置に使う） */
  margin?: number;

  /** ★ 追加: 座標指定（キャンバスの左上原点、px） */
  x?: number;
  y?: number;
}

// 外部凡例用オプション
export　interface HtmlLegendOptions {
  containerId: string;                    // 右側凡例のDOMコンテナID
  colorMap?: Record<string, string>;      // ラベル -> 色
  order?: string[];                       // 表示順（先頭が上に）
  fontSize?: number;                      // 凡例ラベルのフォントサイズ（px）
  boxSize?: number;                       // カラースウォッチの一辺（px）
}