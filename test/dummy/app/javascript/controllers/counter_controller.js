import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["count"]

  increment() {
    var current = parseInt(this.countTarget.textContent) || 0
    this.countTarget.textContent = current + 1
  }

  decrement() {
    var current = parseInt(this.countTarget.textContent) || 0
    this.countTarget.textContent = current - 1
  }
}
