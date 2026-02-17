// 設備状態の数値を色に変換し返す。
export function getPerformanceColor(status: number): string{
    switch (status) {
      case 2:   return '#ccc';        // ❌ ERROR: xám - エラー
      case 1:   return '#84ff00ff';   // ✅ RUNNING: xanh lá - 稼働中
      case 0:   return '#ff8080';   // ⛔ STOP: đỏ - 停止
      case 3:   return '#ff9800';     // 🔧 MAINTENANCE: cam - メンテナンス
      case 4:   return '#2196f3';     // 💤 IDLE: xanh dương - 待機中
      case 5:   return '#ff0000ff';   // ⚠️ WARNING: tím - 警告(4h以上停止)
      case 6:   return '#4f6fff';     // 稼働中(目標稼働率以上)
      default:  return '#9e9e9e';     // ❓ Không xác định - 不明
    }
  }

// 設定された色をカウントし、個数を返す
export function countColorsFromMachines(machines: any[]): { [color: string]: number } {
    const colorCount: { [color: string]: number } = {};
    machines.forEach(machine => {
      const color = machine.schedule_stop_machine
        ? '#ccc' // Stop 表示と同じ条件で色を固定
        : getPerformanceColor(machine.status); // 通常の色

      colorCount[color] = (colorCount[color] || 0) + 1;
    });

    return colorCount;
  }