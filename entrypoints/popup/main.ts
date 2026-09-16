import { initializePopup } from "../../src/popup-controller";
import "./style.css";

void initializePopup(document).catch((error: unknown) => {
  console.error("Failed to initialize the popup.", error);
});
