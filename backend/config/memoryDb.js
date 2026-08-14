import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, "..", "db_fallback.json");

// Ensure DB file exists
const initializeDbFile = () => {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(
      DB_FILE,
      JSON.stringify({ users: [], posts: [], calendars: [], products: [], buyRequests: [], contracts: [], orders: [], yieldPredictions: [], livestock: [] }, null, 2)
    );
  }
};

const readDb = () => {
  initializeDbFile();
  try {
    const data = fs.readFileSync(DB_FILE, "utf8");
    const parsed = JSON.parse(data);
    if (!parsed.buyRequests) parsed.buyRequests = [];
    if (!parsed.contracts) parsed.contracts = [];
    if (!parsed.orders) parsed.orders = [];
    if (!parsed.yieldPredictions) parsed.yieldPredictions = [];
    if (!parsed.livestock) parsed.livestock = [];
    return parsed;
  } catch (err) {
    console.error("Error reading memory DB file:", err);
    return { users: [], posts: [], calendars: [], products: [], buyRequests: [], contracts: [], orders: [], yieldPredictions: [], livestock: [] };
  }
};

const writeDb = (data) => {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("Error writing memory DB file:", err);
  }
};

// Simple unique ID generator
const generateId = () => {
  return "mem_" + Math.random().toString(36).substr(2, 9) + "_" + Date.now();
};

class MemoryQuery {
  constructor(dataPromise) {
    this.dataPromise = dataPromise;
  }
  populate() {
    return this;
  }
  sort(sortOption) {
    this.dataPromise = this.dataPromise.then((data) => {
      if (Array.isArray(data)) {
        return [...data].sort((a, b) => {
          const dateA = new Date(a.createdAt || 0);
          const dateB = new Date(b.createdAt || 0);
          return dateB - dateA;
        });
      }
      return data;
    });
    return this;
  }
  then(onFulfilled, onRejected) {
    return this.dataPromise.then(onFulfilled, onRejected);
  }
}

// User Mock Model
export const UserMock = {
  find: (filter = {}) => {
    const db = readDb();
    let users = [...db.users];
    // Support basic filter fields
    if (filter.role) users = users.filter(u => u.role === filter.role);
    if (filter.$or) {
      users = users.filter(u => filter.$or.some(cond => {
        return Object.entries(cond).some(([k, v]) => {
          if (v && v.$regex) return new RegExp(v.$regex, v.$options || '').test(u[k] || '');
          return u[k] === v;
        });
      }));
    }
    return new MemoryQuery(Promise.resolve(users));
  },

  findOne: (filter) => {
    const db = readDb();
    let user = null;

    if (filter.$or) {
      user = db.users.find(u =>
        filter.$or.some(cond => Object.entries(cond).every(([k, v]) => u[k] === v))
      );
    } else if (filter.email) {
      user = db.users.find(u => u.email === filter.email);
    } else if (filter._id) {
      user = db.users.find(u => String(u._id) === String(filter._id));
    } else {
      const key = Object.keys(filter)[0];
      user = key ? db.users.find(u => u[key] === filter[key]) : null;
    }

    // Return a thenable with .select() support
    let _includePassword = false;
    const query = {
      select: function(fields) {
        if (typeof fields === 'string' && fields.includes('+password')) {
          _includePassword = true;
        }
        return this;
      },
      then: function(onFulfilled, onRejected) {
        let result = user ? { ...user } : null;
        if (result && !_includePassword) {
          delete result.password;
          delete result.refreshTokens;
        }
        if (result) {
          result.save = async function() {
            const currentDb = readDb();
            const idx = currentDb.users.findIndex(u => String(u._id) === String(this._id));
            if (idx !== -1) {
              const { save, select, then, ...cleanData } = this;
              currentDb.users[idx] = cleanData;
              writeDb(currentDb);
            }
            return this;
          };
        }
        return Promise.resolve(result).then(onFulfilled, onRejected);
      }
    };
    return query;
  },

  findById: (id) => {
    const db = readDb();
    const user = db.users.find(u => String(u._id) === String(id));
    const query = {
      select: function(fields) {
        // Store which fields to exclude/include
        this._selectFields = fields;
        return this;
      },
      then: function(onFulfilled, onRejected) {
        const result = user ? { ...user } : null;
        if (result) {
          // Always remove sensitive fields unless explicitly requested with +
          const includePassword = this._selectFields && this._selectFields.includes('+password');
          if (!includePassword) delete result.password;
          delete result.refreshTokens;
          delete result.emailVerifyToken;
          delete result.phoneOtp;
        }
        return Promise.resolve(result).then(onFulfilled, onRejected);
      }
    };
    return query;
  },

  findByIdAndUpdate: async (id, updates, options = {}) => {
    const db = readDb();
    const idx = db.users.findIndex(u => String(u._id) === String(id));
    if (idx === -1) return null;
    // Handle $inc operator
    if (updates.$inc) {
      for (const [k, v] of Object.entries(updates.$inc)) {
        db.users[idx][k] = (db.users[idx][k] || 0) + v;
      }
      delete updates.$inc;
    }
    // Handle $push operator
    if (updates.$push) {
      for (const [k, v] of Object.entries(updates.$push)) {
        if (!Array.isArray(db.users[idx][k])) db.users[idx][k] = [];
        if (v.$each) {
          db.users[idx][k].push(...v.$each);
        } else {
          db.users[idx][k].push(v);
        }
      }
      delete updates.$push;
    }
    // Merge flat fields
    const flat = Object.fromEntries(Object.entries(updates).filter(([k]) => !k.startsWith('$')));
    db.users[idx] = { ...db.users[idx], ...flat, updatedAt: new Date().toISOString() };
    writeDb(db);
    return options.new ? { ...db.users[idx] } : { ...db.users[idx] };
  },

  findOneAndUpdate: async (filter, updates, options = {}) => {
    const db = readDb();
    let idx = -1;
    if (filter.email) idx = db.users.findIndex(u => u.email === filter.email);
    else if (filter._id) idx = db.users.findIndex(u => String(u._id) === String(filter._id));
    if (idx === -1) return null;
    const flat = Object.fromEntries(Object.entries(updates).filter(([k]) => !k.startsWith('$')));
    db.users[idx] = { ...db.users[idx], ...flat, updatedAt: new Date().toISOString() };
    writeDb(db);
    return options.new ? { ...db.users[idx] } : { ...db.users[idx] };
  },

  countDocuments: async (filter = {}) => {
    const db = readDb();
    let users = db.users;
    if (filter.role) users = users.filter(u => u.role === filter.role);
    return users.length;
  },

  findOneAndDelete: async (filter) => {
    const db = readDb();
    const idx = filter.email
      ? db.users.findIndex(u => u.email === filter.email)
      : -1;
    if (idx === -1) return null;
    const [deleted] = db.users.splice(idx, 1);
    writeDb(db);
    return deleted;
  },

  create: async (userData) => {
    const db = readDb();
    // Check for duplicate email
    if (userData.email && db.users.some(u => u.email === userData.email)) {
      const err = new Error('E11000 duplicate key error');
      err.code = 11000;
      throw err;
    }
    const newUser = {
      _id: generateId(),
      isActive: true,      // Default: account is active
      emailVerified: false, // Default: email not verified
      loginCount: 0,
      ...userData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.users.push(newUser);
    writeDb(db);
    // Return without sensitive fields
    const { password: _pw, refreshTokens: _rt, emailVerifyToken: _evt, phoneOtp: _po, ...safeUser } = newUser;
    return safeUser;
  }
};

// Post Mock Model
export const PostMock = {
  find: () => {
    const db = readDb();
    const populated = db.posts.map((post) => {
      const authorUser = db.users.find((u) => String(u._id) === String(post.author));
      const postCopy = { ...post };
      postCopy.author = authorUser ? { _id: authorUser._id, name: authorUser.name } : { name: "Unknown Farmer" };
      
      if (postCopy.replies) {
        postCopy.replies = postCopy.replies.map((rep) => {
          const repAuthor = db.users.find((u) => String(u._id) === String(rep.author));
          return {
            ...rep,
            author: repAuthor ? { _id: repAuthor._id, name: repAuthor.name } : { name: "Farmer" }
          };
        });
      }
      return postCopy;
    });
    return new MemoryQuery(Promise.resolve(populated));
  },
  findById: (id) => {
    const db = readDb();
    const post = db.posts.find((p) => String(p._id) === String(id));
    
    if (!post) {
      return {
        populate: function() { return this; },
        then: function(onFulfilled) { return Promise.resolve(null).then(onFulfilled); }
      };
    }

    const authorUser = db.users.find((u) => String(u._id) === String(post.author));
    const postCopy = {
      ...post,
      save: async function () {
        const currentDb = readDb();
        const index = currentDb.posts.findIndex((p) => String(p._id) === String(this._id));
        if (index !== -1) {
          // Remove mongoose function decorators before saving
          const { save, populate, then, ...cleanData } = this;
          currentDb.posts[index] = cleanData;
          writeDb(currentDb);
        }
        return this;
      }
    };
    postCopy.author = authorUser ? { _id: authorUser._id, name: authorUser.name } : { name: "Unknown Farmer" };

    if (postCopy.replies) {
      postCopy.replies = postCopy.replies.map((rep) => {
        const repAuthor = db.users.find((u) => String(u._id) === String(rep.author));
        return {
          ...rep,
          author: repAuthor ? { _id: repAuthor._id, name: repAuthor.name } : { name: "Farmer" }
        };
      });
    }

    const query = {
      populate: function(path, select) {
        return this;
      },
      then: function(onFulfilled, onRejected) {
        return Promise.resolve(postCopy).then(onFulfilled, onRejected);
      }
    };
    return query;
  },
  create: async (postData) => {
    const db = readDb();
    const newPost = {
      _id: generateId(),
      replies: [],
      ...postData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.posts.push(newPost);
    writeDb(db);
    return newPost;
  }
};

// Product Mock Model
export const ProductMock = {
  countDocuments: async () => {
    const db = readDb();
    return db.products.length;
  },
  insertMany: async (productsArr) => {
    const db = readDb();
    const formatted = productsArr.map((p) => ({
      _id: generateId(),
      ...p,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));
    db.products.push(...formatted);
    writeDb(db);
    return formatted;
  },
  find: (filter) => {
    const db = readDb();
    let result = db.products;
    if (filter && filter.sellerId) {
      result = result.filter((p) => String(p.sellerId) === String(filter.sellerId));
    }
    return new MemoryQuery(Promise.resolve(result));
  },
  findOne: async (filter) => {
    const db = readDb();
    const product = db.products.find((p) => {
      const matchId = String(p._id) === String(filter._id);
      if (!p.sellerId) return matchId;
      return matchId && String(p.sellerId) === String(filter.sellerId);
    });
    if (!product) return null;
    return {
      ...product,
      save: async function () {
        const currentDb = readDb();
        const index = currentDb.products.findIndex((p) => String(p._id) === String(this._id));
        if (index !== -1) {
          const { save, ...cleanData } = this;
          currentDb.products[index] = cleanData;
          writeDb(currentDb);
        }
        return this;
      }
    };
  },
  findOneAndDelete: async (filter) => {
    const db = readDb();
    const index = db.products.findIndex((p) => {
      const matchId = String(p._id) === String(filter._id);
      if (!p.sellerId) return matchId;
      return matchId && String(p.sellerId) === String(filter.sellerId);
    });
    if (index === -1) return null;
    const removed = db.products.splice(index, 1)[0];
    writeDb(db);
    return removed;
  },
  create: async (prodData) => {
    const db = readDb();
    const newProduct = {
      _id: generateId(),
      rating: 5.0,
      reviews: 0,
      stock: "In Stock",
      ...prodData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.products.push(newProduct);
    writeDb(db);
    return newProduct;
  },
  deleteMany: async (filter) => {
    const db = readDb();
    const beforeLength = db.products.length;
    if (!filter || Object.keys(filter).length === 0) {
      db.products = [];
    } else {
      db.products = db.products.filter((p) => {
        if (filter.sellerId && filter.sellerId.$exists === false) {
          return p.sellerId !== undefined && p.sellerId !== null;
        }
        for (const key in filter) {
          if (p[key] !== filter[key]) return true;
        }
        return false;
      });
    }
    writeDb(db);
    return { deletedCount: beforeLength - db.products.length };
  }
};

// CropCalendar Mock Model
export const CropCalendarMock = {
  find: (filter) => {
    const db = readDb();
    const matched = db.calendars.filter((c) => String(c.user) === String(filter.user));
    return new MemoryQuery(Promise.resolve(matched));
  },
  findOne: async (filter) => {
    const db = readDb();
    const cal = db.calendars.find(
      (c) => String(c._id) === String(filter._id) && String(c.user) === String(filter.user)
    );
    if (!cal) return null;

    const calObj = {
      ...cal,
      save: async function () {
        const currentDb = readDb();
        const index = currentDb.calendars.findIndex((c) => String(c._id) === String(this._id));
        if (index !== -1) {
          const { save, ...cleanData } = this;
          currentDb.calendars[index] = cleanData;
          writeDb(currentDb);
        }
        return this;
      }
    };

    if (calObj.tasks) {
      calObj.tasks.id = function (taskId) {
        return this.find((t) => String(t._id) === String(taskId));
      };
    }

    return calObj;
  },
  create: async (calData) => {
    const db = readDb();
    const tasksWithId = calData.tasks.map((t) => ({
      _id: generateId(),
      ...t
    }));

    const newCalendar = {
      _id: generateId(),
      ...calData,
      tasks: tasksWithId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.calendars.push(newCalendar);
    writeDb(db);
    return newCalendar;
  },
  findOneAndDelete: async (filter) => {
    const db = readDb();
    const index = db.calendars.findIndex(
      (c) => String(c._id) === String(filter._id) && String(c.user) === String(filter.user)
    );
    if (index === -1) return null;

    const removed = db.calendars.splice(index, 1)[0];
    writeDb(db);
    return removed;
  }
};

// BuyRequest Mock Model
export const BuyRequestMock = {
  find: () => {
    const db = readDb();
    if (!db.buyRequests) db.buyRequests = [];
    return new MemoryQuery(Promise.resolve(db.buyRequests));
  },
  create: async (reqData) => {
    const db = readDb();
    if (!db.buyRequests) db.buyRequests = [];
    const newRequest = {
      _id: generateId(),
      ...reqData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.buyRequests.push(newRequest);
    writeDb(db);
    return newRequest;
  },
  findOneAndDelete: async (filter) => {
    const db = readDb();
    if (!db.buyRequests) db.buyRequests = [];
    const index = db.buyRequests.findIndex((r) => {
      const matchId = String(r._id) === String(filter._id);
      if (!r.merchantId) return matchId;
      return matchId && String(r.merchantId) === String(filter.merchantId);
    });
    if (index === -1) return null;
    const removed = db.buyRequests.splice(index, 1)[0];
    writeDb(db);
    return removed;
  }
};

// Contract Mock Model
export const ContractMock = {
  find: (filter) => {
    const db = readDb();
    if (!db.contracts) db.contracts = [];
    let result = db.contracts;
    if (filter && filter.buyerId) {
      result = result.filter((c) => String(c.buyerId) === String(filter.buyerId));
    } else if (filter && filter.sellerName) {
      result = result.filter((c) => c.sellerName === filter.sellerName);
    }
    return new MemoryQuery(Promise.resolve(result));
  },
  create: async (contractData) => {
    const db = readDb();
    if (!db.contracts) db.contracts = [];
    const newContract = {
      _id: generateId(),
      status: "Pending",
      ...contractData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.contracts.push(newContract);
    writeDb(db);
    return newContract;
  },
  findByIdAndUpdate: async (id, update) => {
    const db = readDb();
    if (!db.contracts) db.contracts = [];
    const index = db.contracts.findIndex((c) => String(c._id) === String(id));
    if (index === -1) return null;
    
    const setFields = update.$set || update;
    const updated = {
      ...db.contracts[index],
      ...setFields,
      updatedAt: new Date().toISOString()
    };
    db.contracts[index] = updated;
    writeDb(db);
    return updated;
  }
};

// Order Mock Model
export const OrderMock = {
  find: (filter) => {
    const db = readDb();
    if (!db.orders) db.orders = [];
    let result = db.orders;
    if (filter && filter.userId) {
      result = result.filter((o) => String(o.userId) === String(filter.userId));
    }
    return new MemoryQuery(Promise.resolve(result));
  },
  create: async (orderData) => {
    const db = readDb();
    if (!db.orders) db.orders = [];
    const newOrder = {
      _id: generateId(),
      status: "Processing",
      ...orderData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.orders.push(newOrder);
    writeDb(db);
    return newOrder;
  }
};

// YieldPrediction Mock Model
export const YieldPredictionMock = {
  find: (filter) => {
    const db = readDb();
    if (!db.yieldPredictions) db.yieldPredictions = [];
    let result = db.yieldPredictions;
    if (filter && filter.user) {
      result = result.filter((y) => String(y.user) === String(filter.user));
    }
    return new MemoryQuery(Promise.resolve(result));
  },
  create: async (predictionData) => {
    const db = readDb();
    if (!db.yieldPredictions) db.yieldPredictions = [];
    const newPrediction = {
      _id: generateId(),
      ...predictionData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.yieldPredictions.push(newPrediction);
    writeDb(db);
    return newPrediction;
  },
  findOneAndDelete: async (filter) => {
    const db = readDb();
    if (!db.yieldPredictions) db.yieldPredictions = [];
    const index = db.yieldPredictions.findIndex(
      (y) => String(y._id) === String(filter._id) && String(y.user) === String(filter.user)
    );
    if (index === -1) return null;
    const removed = db.yieldPredictions.splice(index, 1)[0];
    writeDb(db);
    return removed;
  }
};

// Livestock Mock Model
export const LivestockMock = {
  find: (filter) => {
    const db = readDb();
    if (!db.livestock) db.livestock = [];
    let result = db.livestock;
    if (filter && filter.user) {
      result = result.filter((l) => String(l.user) === String(filter.user));
    }
    return new MemoryQuery(Promise.resolve(result));
  },
  findOne: async (filter) => {
    const db = readDb();
    if (!db.livestock) db.livestock = [];
    const animal = db.livestock.find(
      (l) => String(l._id) === String(filter._id) && String(l.user) === String(filter.user)
    );
    if (!animal) return null;

    const animalObj = {
      ...animal,
      save: async function () {
        const currentDb = readDb();
        const index = currentDb.livestock.findIndex((l) => String(l._id) === String(this._id));
        if (index !== -1) {
          const { save, ...cleanData } = this;
          currentDb.livestock[index] = cleanData;
          writeDb(currentDb);
        }
        return this;
      }
    };

    if (animalObj.milkRecords) {
      animalObj.milkRecords.id = function (subId) {
        return this.find((r) => String(r._id) === String(subId));
      };
    }
    if (animalObj.vaccinations) {
      animalObj.vaccinations.id = function (subId) {
        return this.find((v) => String(v._id) === String(subId));
      };
    }
    if (animalObj.feedingSchedules) {
      animalObj.feedingSchedules.id = function (subId) {
        return this.find((f) => String(f._id) === String(subId));
      };
    }

    return animalObj;
  },
  create: async (livestockData) => {
    const db = readDb();
    if (!db.livestock) db.livestock = [];
    const newAnimal = {
      _id: generateId(),
      milkRecords: [],
      vaccinations: [],
      feedingSchedules: [],
      ...livestockData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.livestock.push(newAnimal);
    writeDb(db);
    return newAnimal;
  },
  findOneAndDelete: async (filter) => {
    const db = readDb();
    if (!db.livestock) db.livestock = [];
    const index = db.livestock.findIndex(
      (l) => String(l._id) === String(filter._id) && String(l.user) === String(filter.user)
    );
    if (index === -1) return null;
    const removed = db.livestock.splice(index, 1)[0];
    writeDb(db);
    return removed;
  }
};

// Farm Mock Model
export const FarmMock = {
  find: (filter = {}) => {
    const db = readDb();
    if (!db.farms) db.farms = [];
    let items = db.farms;
    if (filter.owner) items = items.filter(f => String(f.owner) === String(filter.owner));
    return new MemoryQuery(Promise.resolve(items));
  },
  findById: (id) => {
    const db = readDb();
    if (!db.farms) db.farms = [];
    const item = db.farms.find(f => String(f._id) === String(id));
    return Promise.resolve(item || null);
  },
  findOne: (filter = {}) => {
    const db = readDb();
    if (!db.farms) db.farms = [];
    const item = db.farms.find(f => {
      if (filter._id && String(f._id) !== String(filter._id)) return false;
      if (filter.owner && String(f.owner) !== String(filter.owner)) return false;
      return true;
    });
    return Promise.resolve(item || null);
  },
  create: async (data) => {
    const db = readDb();
    if (!db.farms) db.farms = [];
    const newFarm = {
      _id: generateId(),
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.farms.push(newFarm);
    writeDb(db);
    return newFarm;
  },
  findByIdAndUpdate: async (id, updates, options = {}) => {
    const db = readDb();
    if (!db.farms) db.farms = [];
    const idx = db.farms.findIndex(f => String(f._id) === String(id));
    if (idx === -1) return null;
    db.farms[idx] = { ...db.farms[idx], ...updates, updatedAt: new Date().toISOString() };
    writeDb(db);
    return db.farms[idx];
  },
  findByIdAndDelete: async (id) => {
    const db = readDb();
    if (!db.farms) db.farms = [];
    const idx = db.farms.findIndex(f => String(f._id) === String(id));
    if (idx === -1) return null;
    const [deleted] = db.farms.splice(idx, 1);
    writeDb(db);
    return deleted;
  }
};

// Notification Mock Model
export const NotificationMock = {
  find: (filter = {}) => {
    const db = readDb();
    if (!db.notifications) db.notifications = [];
    return new MemoryQuery(Promise.resolve(db.notifications));
  },
  create: async (data) => {
    const db = readDb();
    if (!db.notifications) db.notifications = [];
    const newNotif = { _id: generateId(), ...data, createdAt: new Date().toISOString() };
    db.notifications.push(newNotif);
    writeDb(db);
    return newNotif;
  }
};

// AuditLog Mock Model
export const AuditLogMock = {
  create: async (data) => {
    const db = readDb();
    if (!db.auditLogs) db.auditLogs = [];
    const newAudit = { _id: generateId(), ...data, timestamp: new Date().toISOString() };
    db.auditLogs.push(newAudit);
    writeDb(db);
    return newAudit;
  },
  find: () => new MemoryQuery(Promise.resolve([]))
};

