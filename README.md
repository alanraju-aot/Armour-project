# Armor Coating Services - Work Order Report Manager

A high-fidelity, self-contained Work Order Report Generation and Database Management tool designed for **Armor Coating Services, Inc.**

This application is completely portable. It runs locally on any computer using Python's built-in web server and saves data directly as a local JSON file. No heavy database engine or complex software installation is required!

---

## 🚀 How to Run on a New Computer

Follow these 4 simple steps to run this application on any Windows, macOS, or Linux computer:

### 1. Copy the Project Folder
Copy the entire `Armour coating` directory (which contains this `README.md`, `index.html`, `server.py`, `app.js`, `styles.css`, `samples.js`, and the `data` folder) and paste it anywhere on the new computer (e.g., in a Documents folder or on another drive).

### 2. Open a Terminal/Command Prompt
Open a terminal in the folder where you pasted the project:
* **Windows**: Open the folder in File Explorer, click in the address bar at the top, type `cmd` and press **Enter**.
* **macOS / Linux**: Open the Terminal app and navigate using `cd`, for example:
  ```bash
  cd ~/Documents/Armour coating
  ```

### 3. Start the Server
Run the built-in lightweight Python file database server by typing:
```bash
python server.py
```
*(This starts a local web server on port `8085` and links the application to the physical `./data/work_orders.json` database file. If Python is not installed, download it from [python.org](https://www.python.org/).)*

### 4. Open the App in Your Browser
Open any modern web browser (Google Chrome, Microsoft Edge, Firefox, or Safari) and visit:
👉 **[http://localhost:8085/index.html](http://localhost:8085/index.html)**

---

## 💾 How Data Portability Works

* **The Local Database (`data/work_orders.json`)**: When you save records, they are written to a file named `work_orders.json` inside a `data` folder located in the same directory as the server.
* **Transferring Records**: To move your saved database records to another computer, simply make sure you copy the `data` folder along with the other project files.
* **Automatic Offline Fallback**: If Python is not available or the server is not running, the application will automatically fall back to saving your work orders in the browser's built-in `localStorage`. 

---

## 🛠️ Project Directory Structure

* [index.html](file:///D:/Armour%20coating/index.html) - User Interface structure, input columns, and Access navigation layouts.
* [styles.css](file:///D:/Armour%20coating/styles.css) - Premium slate/indigo theme styling, dark/light modes, scroll containers, and printable page formats.
* [app.js](file:///D:/Armour%20coating/app.js) - Client-side app controller handling search filters, validation, page navigation, and dual-mode syncing.
* [samples.js](file:///D:/Armour%20coating/samples.js) - Pre-packaged, high-fidelity sample records for instant testing.
* [server.py](file:///D:/Armour%20coating/server.py) - Portable HTTP server managing GET/POST requests for reading/writing local database records.
