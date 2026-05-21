import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

// Interfaces for Data
interface Product {
  id: string;
  name: string;
  version: string;
  description: string;
}

interface License {
  key: string;
  status: "ACTIVE" | "INACTIVE" | "EXPIRED" | "REVOKED";
  product: string;
  account: string; // MT5 Account number, "" or "Unbound"
  customerName: string;
  customerEmail: string;
  expiryDate: string; // YYYY-MM-DD
  maxAccounts: number;
  createdAt: string;
  broker?: string;
  balance?: number;
  totalProfit?: number;
}

const PORT = 3000;
const DATA_DIR = path.resolve(process.cwd(), "data");
const LICENSES_FILE = path.join(DATA_DIR, "licenses.json");
const PRODUCTS_FILE = path.join(DATA_DIR, "products.json");

// Helper function to read/write persistent JSON files
function ensureDirectoryExistence(filePath: string) {
  const dirname = path.dirname(filePath);
  if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname, { recursive: true });
  }
}

function loadProducts(): Product[] {
  try {
    ensureDirectoryExistence(PRODUCTS_FILE);
    if (fs.existsSync(PRODUCTS_FILE)) {
      const raw = fs.readFileSync(PRODUCTS_FILE, "utf-8");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error("Error loading products:", err);
  }
  
  // Default Products
  const defaults: Product[] = [
    { id: "p1", name: "ORYX GRID", version: "1.6", description: "Grid-based martingale Expert Advisor optimized for major currency pairs." },
    { id: "p2", name: "GOLD MASTER MT5", version: "2.1", description: "Specially tuned Expert Advisor for XAUUSD (Gold) swing trading." },
    { id: "p3", name: "SCALPER PRO", version: "1.0", description: "High-frequency scalper with artificial market neural networks." }
  ];
  saveProducts(defaults);
  return defaults;
}

function saveProducts(products: Product[]) {
  try {
    ensureDirectoryExistence(PRODUCTS_FILE);
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving products:", err);
  }
}

function loadLicenses(): License[] {
  try {
    ensureDirectoryExistence(LICENSES_FILE);
    if (fs.existsSync(LICENSES_FILE)) {
      const raw = fs.readFileSync(LICENSES_FILE, "utf-8");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error("Error loading licenses:", err);
  }
  
  // Default Licenses
  const defaults: License[] = [
    {
      key: "EA-A1B2C3D4-E5F6A7B8-C9D0E1F2-A3B4C5D6",
      status: "ACTIVE",
      product: "ORYX GRID",
      account: "12345678",
      customerName: "Ahmad Rizki",
      customerEmail: "ahmad.rizki@email.com",
      expiryDate: "2026-12-31",
      maxAccounts: 1,
      createdAt: "2026-01-10"
    },
    {
      key: "EA-F1E2D3C4-B5A6F7E8-D9C0B1A2-F3E4D5C6",
      status: "ACTIVE",
      product: "ORYX GRID",
      account: "87654321",
      customerName: "Budi Santoso",
      customerEmail: "budi.s@trader.id",
      expiryDate: "2026-06-30",
      maxAccounts: 1,
      createdAt: "2026-02-14"
    },
    {
      key: "EA-99887766-55443322-11AABBCC-DDEEFF11",
      status: "ACTIVE",
      product: "GOLD MASTER MT5",
      account: "66778899",
      customerName: "Gita Permata",
      customerEmail: "gita.p@finance.id",
      expiryDate: "2027-03-15",
      maxAccounts: 2,
      createdAt: "2026-03-01"
    },
    {
      key: "EA-11223344-55667788-99AABBCC-DDEEFF00",
      status: "INACTIVE",
      product: "ORYX GRID",
      account: "",
      customerName: "Citra Dewi",
      customerEmail: "citra@fx.com",
      expiryDate: "2027-01-15",
      maxAccounts: 1,
      createdAt: "2026-04-05"
    },
    {
      key: "EA-ABCD1234-EF567890-ABCD1234-EF567890",
      status: "INACTIVE",
      product: "GOLD MASTER MT5",
      account: "",
      customerName: "Agus Salim",
      customerEmail: "agus.salim@trader.com",
      expiryDate: "2026-12-31",
      maxAccounts: 1,
      createdAt: "2026-05-01"
    },
    {
      key: "EA-5DF1B415-D6F72A00-9CED3EC9-1B998275",
      status: "EXPIRED",
      product: "ORYX GRID",
      account: "11112222",
      customerName: "John Doe",
      customerEmail: "john.doe@gmail.com",
      expiryDate: "2025-05-15",
      maxAccounts: 1,
      createdAt: "2025-01-15"
    }
  ];
  saveLicenses(defaults);
  return defaults;
}

function saveLicenses(licenses: License[]) {
  try {
    ensureDirectoryExistence(LICENSES_FILE);
    fs.writeFileSync(LICENSES_FILE, JSON.stringify(licenses, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving licenses:", err);
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // Log APIs for debugging
  app.use((req, res, next) => {
    if (req.path.startsWith("/api/")) {
      console.log(`[API CALL] ${req.method} ${req.path}`);
    }
    next();
  });

  // 1. Validation API for MT5 WebRequest (Supports both GET and POST)
  // Endpoint: /api/validate
  // Parameters: key (license key), account (MT5 account ID), product (optional name)
  const handleValidate = (req: express.Request, res: express.Response) => {
    const key = (req.query.key || req.body.key || "").toString().trim();
    const account = (req.query.account || req.body.account || "").toString().trim();
    const product = (req.query.product || req.body.product || "").toString().trim();
    const broker = (req.query.broker || req.body.broker || "").toString().trim();
    const balanceRaw = req.query.balance || req.body.balance;
    const profitRaw = req.query.profit || req.body.profit || req.query.totalProfit || req.body.totalProfit;

    if (!key) {
      return res.status(200).json({
        status: "error",
        active: false,
        message: "Missing license key parameters (key)"
      });
    }

    if (!account) {
      return res.status(200).json({
        status: "error",
        active: false,
        message: "Missing MT5 account parameter (account)"
      });
    }

    const licenses = loadLicenses();
    const licenseIndex = licenses.findIndex(l => l.key.toLowerCase() === key.toLowerCase());

    if (licenseIndex === -1) {
      return res.status(200).json({
        status: "error",
        active: false,
        message: "License key not found"
      });
    }

    const license = licenses[licenseIndex];
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    // Check expiration
    if (license.expiryDate && license.expiryDate < today) {
      if (license.status !== "EXPIRED") {
        license.status = "EXPIRED";
        saveLicenses(licenses);
      }
      return res.status(200).json({
        status: "error",
        active: false,
        message: `License key has expired on ${license.expiryDate}`
      });
    }

    // Check statuses
    if (license.status === "REVOKED") {
      return res.status(200).json({
        status: "error",
        active: false,
        message: "License has been revoked/blocked"
      });
    }

    // Capture telemetry stats
    let updatedLiveStats = false;
    if (broker) {
      license.broker = broker;
      updatedLiveStats = true;
    }
    if (balanceRaw !== undefined) {
      const parsedBalance = Number(balanceRaw);
      if (!isNaN(parsedBalance)) {
        license.balance = parsedBalance;
        updatedLiveStats = true;
      }
    }
    if (profitRaw !== undefined) {
      const parsedProfit = Number(profitRaw);
      if (!isNaN(parsedProfit)) {
        license.totalProfit = parsedProfit;
        updatedLiveStats = true;
      }
    }

    if (license.status === "INACTIVE" && !license.account) {
      // Automatic binding on first EA execution
      license.account = account;
      license.status = "ACTIVE";
      saveLicenses(licenses);
      return res.status(200).json({
        status: "active",
        active: true,
        message: `Validated! License bound automatically to MT5 account ${account}`,
        customer: license.customerName,
        product: license.product,
        expiry: license.expiryDate
      });
    }

    // If active, verify account mapping
    if (license.status === "ACTIVE") {
      if (!license.account || license.account === "Unbound" || license.account === "0") {
        license.account = account;
        saveLicenses(licenses);
        return res.status(200).json({
          status: "active",
          active: true,
          message: `License bound successfully inside Active state to ${account}`,
          customer: license.customerName,
          product: license.product,
          expiry: license.expiryDate
        });
      }

      if (license.account !== account) {
        return res.status(200).json({
          status: "error",
          active: false,
          message: `License key mismatch. This key is bound to account ${license.account}, not ${account}`
        });
      }

      // Check product details if supplied
      if (product && license.product.toLowerCase() !== product.toLowerCase()) {
        console.log(`Product parameter mismatch (License contains: ${license.product}, EA queried: ${product}), but proceeding as Key and Account are correct.`);
      }

      if (updatedLiveStats) {
        saveLicenses(licenses);
      }

      return res.status(200).json({
        status: "active",
        active: true,
        message: `Validation successful. Authorized for MT5 account ${account}`,
        customer: license.customerName,
        product: license.product,
        expiry: license.expiryDate
      });
    }

    // Fallback error
    return res.status(200).json({
      status: "error",
      active: false,
      message: `License status invalid: ${license.status}`
    });
  };

  app.get("/api/validate", handleValidate);
  app.post("/api/validate", handleValidate);

  // 2. Core License API Ends
  app.get("/api/licenses", (req, res) => {
    const licenses = loadLicenses();
    // Update expired statuses on the fly
    const today = new Date().toISOString().split("T")[0];
    let changed = false;
    licenses.forEach(l => {
      if (l.expiryDate && l.expiryDate < today && l.status === "ACTIVE") {
        l.status = "EXPIRED";
        changed = true;
      }
    });
    if (changed) {
      saveLicenses(licenses);
    }
    res.json(licenses);
  });

  app.post("/api/licenses", (req, res) => {
    const { key, product, account, customerName, customerEmail, expiryDate, maxAccounts, status } = req.body;
    
    if (!key) {
      return res.status(400).json({ error: "License key is missing!" });
    }

    const licenses = loadLicenses();
    if (licenses.some(l => l.key.toLowerCase() === key.toLowerCase())) {
      return res.status(400).json({ error: "License key already exists!" });
    }

    const newLicense: License = {
      key: key.trim(),
      product: product || "ORYX GRID",
      account: account ? account.trim() : "",
      customerName: customerName || "No name",
      customerEmail: customerEmail || "",
      expiryDate: expiryDate || "2026-12-31",
      maxAccounts: Number(maxAccounts || 1),
      status: status || "ACTIVE",
      createdAt: new Date().toISOString().split("T")[0]
    };

    licenses.unshift(newLicense);
    saveLicenses(licenses);
    res.json(newLicense);
  });

  // Bulk Generate Licenses
  app.post("/api/licenses/bulk", (req, res) => {
    const { count, product, expiryDate, maxAccounts, prefix } = req.body;
    const qty = Math.min(Math.max(Number(count || 5), 1), 50); // Limit is 50 keys at once
    const licenses = loadLicenses();
    const created: License[] = [];

    // Simple key generator
    const generateSegment = () => {
      return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1)
        .toUpperCase();
    };

    for (let i = 0; i < qty; i++) {
      const s1 = generateSegment();
      const s2 = generateSegment();
      const s3 = generateSegment();
      const s4 = generateSegment();
      const keySegment = `EA-${s1}${s2}-${s3}${s4}`;
      const finalKey = prefix ? `${prefix}-${s1}${s2}-${s3}` : keySegment;

      const newLicense: License = {
        key: finalKey,
        product: product || "ORYX GRID",
        account: "",
        customerName: `Bulk Gen #${i+1}`,
        customerEmail: "",
        expiryDate: expiryDate || "2026-12-31",
        maxAccounts: Number(maxAccounts || 1),
        status: "ACTIVE",
        createdAt: new Date().toISOString().split("T")[0]
      };
      licenses.unshift(newLicense);
      created.push(newLicense);
    }

    saveLicenses(licenses);
    res.json(created);
  });

  app.put("/api/licenses/:key", (req, res) => {
    const { key } = req.params;
    const { status, account, product, customerName, customerEmail, expiryDate, maxAccounts } = req.body;
    
    const licenses = loadLicenses();
    const idx = licenses.findIndex(l => l.key.toLowerCase() === key.toLowerCase());

    if (idx === -1) {
      return res.status(404).json({ error: "License key not found" });
    }

    const license = licenses[idx];
    if (status !== undefined) license.status = status;
    if (account !== undefined) license.account = account.toString().trim();
    if (product !== undefined) license.product = product;
    if (customerName !== undefined) license.customerName = customerName;
    if (customerEmail !== undefined) license.customerEmail = customerEmail;
    if (expiryDate !== undefined) license.expiryDate = expiryDate;
    if (maxAccounts !== undefined) license.maxAccounts = Number(maxAccounts);

    saveLicenses(licenses);
    res.json(license);
  });

  app.delete("/api/licenses/:key", (req, res) => {
    const { key } = req.params;
    const licenses = loadLicenses();
    const filtered = licenses.filter(l => l.key.toLowerCase() !== key.toLowerCase());
    
    if (licenses.length === filtered.length) {
      return res.status(404).json({ error: "License not found" });
    }

    saveLicenses(filtered);
    res.json({ success: true, message: `License ${key} deleted` });
  });

  // 3. Products Endpoints
  app.get("/api/products", (req, res) => {
    res.json(loadProducts());
  });

  app.post("/api/products", (req, res) => {
    const { name, version, description } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Product name is required" });
    }

    const products = loadProducts();
    if (products.some(p => p.name.toLowerCase() === name.toLowerCase())) {
      return res.status(400).json({ error: "Product name already exists" });
    }

    const newProduct: Product = {
      id: "p_" + Date.now(),
      name: name.trim(),
      version: version || "1.0",
      description: description || ""
    };

    products.push(newProduct);
    saveProducts(products);
    res.json(newProduct);
  });

  app.delete("/api/products/:id", (req, res) => {
    const { id } = req.params;
    const products = loadProducts();
    const filtered = products.filter(p => p.id !== id);
    if (products.length === filtered.length) {
      return res.status(404).json({ error: "Product not found" });
    }
    saveProducts(filtered);
    res.json({ success: true, message: `Product ${id} deleted` });
  });

  // Vite middleware setup for Development & serving asset files in Production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Local validating url: http://localhost:${PORT}/api/validate`);
  });
}

startServer();
