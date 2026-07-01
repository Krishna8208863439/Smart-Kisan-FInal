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
  find: () => {
    const db = readDb();
    return new MemoryQuery(Promise.resolve(db.users));
  },
  findOne: async (filter) => {
    const db = readDb();
    const user = db.users.find((u) => u.email === filter.email);
    if (!user) return null;
    return {
      ...user,
      save: async function () {
        const currentDb = readDb();
        const index = currentDb.users.findIndex((u) => String(u._id) === String(this._id));
        if (index !== -1) {
          const { save, ...cleanData } = this;
          currentDb.users[index] = cleanData;
          writeDb(currentDb);
        }
        return this;
      }
    };
  },
  findById: (id) => {
    const db = readDb();
    const user = db.users.find((u) => String(u._id) === String(id));
    
    // Return a thenable query object that supports .select()
    const query = {
      select: function(fields) {
        return this;
      },
      then: function(onFulfilled, onRejected) {
        return Promise.resolve(user || null).then(onFulfilled, onRejected);
      }
    };
    return query;
  },
  create: async (userData) => {
    const db = readDb();
    const newUser = {
      _id: generateId(),
      ...userData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.users.push(newUser);
    writeDb(db);
    return newUser;
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
