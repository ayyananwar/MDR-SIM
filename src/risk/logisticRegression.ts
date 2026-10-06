/**
 * Regularized Logistic Regression (MAP Estimation) Baseline.
 *
 * Implements a standard logistic regression model trained via Gradient Descent
 * with L2 regularization (equivalent to a Gaussian prior on the coefficients).
 */

export class LogisticRegression {
  public weights: number[];
  public bias: number;

  constructor(public numFeatures: number) {
    this.weights = new Array(numFeatures).fill(0);
    this.bias = 0;
  }

  private sigmoid(z: number): number {
    if (z > 20) return 1.0;
    if (z < -20) return 0.0;
    return 1.0 / (1.0 + Math.exp(-z));
  }

  /**
   * Train the model using full-batch Gradient Descent with L2 regularization.
   *
   * @param X Feature matrix
   * @param y Labels (0 or 1)
   * @param epochs Maximum epochs
   * @param learningRate Learning rate
   * @param lambda L2 regularization penalty (Gaussian prior precision)
   */
  public fit(
    X: number[][],
    y: number[],
    epochs: number = 500,
    learningRate: number = 0.01,
    lambda: number = 0.1
  ): void {
    const n = X.length;
    if (n === 0) return;

    for (let epoch = 0; epoch < epochs; epoch++) {
      let biasGradient = 0;
      const weightGradients = new Array(this.numFeatures).fill(0);

      // Compute gradients
      for (let i = 0; i < n; i++) {
        let linearPrediction = this.bias;
        for (let j = 0; j < this.numFeatures; j++) {
          linearPrediction += this.weights[j] * X[i][j];
        }

        const predicted = this.sigmoid(linearPrediction);
        const error = predicted - y[i];

        biasGradient += error;
        for (let j = 0; j < this.numFeatures; j++) {
          weightGradients[j] += error * X[i][j];
        }
      }

      // Update parameters
      this.bias -= learningRate * (biasGradient / n);
      for (let j = 0; j < this.numFeatures; j++) {
        // Include L2 penalty: derivative of lambda/2 * w^2 is lambda * w
        const reg = lambda * this.weights[j];
        this.weights[j] -= learningRate * ((weightGradients[j] / n) + reg);
      }
    }
  }

  public predictProbability(x: number[]): number {
    let z = this.bias;
    for (let j = 0; j < this.numFeatures; j++) {
      z += this.weights[j] * x[j];
    }
    return this.sigmoid(z);
  }
}
