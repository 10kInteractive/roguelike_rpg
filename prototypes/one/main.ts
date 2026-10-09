const app = document.getElementById("app");

if (!app) {
  throw new Error("Missing #app element");
}

app.textContent = "Prototype one";

export {};
