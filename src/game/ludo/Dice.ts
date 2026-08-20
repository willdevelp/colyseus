export class Dice {
  static roll(): number {
    return Math.floor(
      Math.random() * 6
    ) + 1;
  }
}