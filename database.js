import sqlite3 from 'sqlite3';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = resolve(__dirname, 'inventory.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run("CREATE TABLE IF NOT EXISTS inventory (id INTEGER PRIMARY KEY, name TEXT, quantity INTEGER)");
});

export function addToInventory(name, quantity) {
    db.get("SELECT quantity FROM inventory WHERE name = ?", [name], (err, row) => {
        if (err) {
            console.error('Error querying inventory:', err);
            return;
        }

        if (row) {
            // If the item exists, update its quantity
            db.run("UPDATE inventory SET quantity = quantity + ? WHERE name = ?", [quantity, name], (updateErr) => {
                if (updateErr) {
                    console.error('Error updating inventory:', updateErr);
                }
            });
        } else {
            // If the item does not exist, insert it
            const stmt = db.prepare("INSERT INTO inventory (name, quantity) VALUES (?, ?)");
            stmt.run(name, quantity, (insertErr) => {
                if (insertErr) {
                    console.error('Error adding item to inventory:', insertErr);
                }
            });
            stmt.finalize();
        }
    });
}

export function getInventoryItemNames() {
    return new Promise((resolve, reject) => {
        db.all("SELECT name FROM inventory", (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows.map(row => row.name));
            }
        });
    });
}

export function listInventory(callback) {
  db.all("SELECT id, name, quantity FROM inventory", callback);
}

export function removeFromInventory(name, callback) {
    db.run("UPDATE inventory SET quantity = quantity - 1 WHERE name = ? AND quantity > 1", [name], function(err) {
        if (this.changes === 0) {
            // No rows updated means quantity was 1 or item didn't exist, so delete it
            db.run("DELETE FROM inventory WHERE name = ?", [name], callback);
        } else {
            // If a row was updated, just return success
            callback(err);
        }
    });
}
