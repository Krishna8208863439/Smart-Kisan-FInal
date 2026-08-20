import React, { useState, useEffect } from "react";
import api from "../../api";
import { useLanguage } from "../../context/LanguageContext";
import { useHistory } from "../../context/HistoryContext";

// Dynamically load Razorpay SDK
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const INDIAN_STATES = [
  "Maharashtra", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar",
  "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh",
  "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan",
  "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
  "Uttarakhand", "West Bengal"
];

const KisanCheckoutModal = ({
  isOpen,
  onClose,
  cart,
  onClearCart,
  onOrderSuccess,
  onOpenMyOrders
}) => {
  const { language } = useLanguage();
  const { addHistoryEntry } = useHistory();

  // Wizard Steps: "details" | "review" | "payment" | "success" | "failed"
  const [step, setStep] = useState("details");

  // Customer Delivery Details
  const [customer, setCustomer] = useState({
    name: "",
    mobile: "",
    address: "",
    city: "",
    state: "Maharashtra",
    pincode: ""
  });

  // Inline Validation Errors
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Payment method selection inside payment step
  const [paymentMethod, setPaymentMethod] = useState("razorpay"); // "razorpay" | "upi" | "cards" | "netbanking"
  const [upiId, setUpiId] = useState("");
  const [cardDetails, setCardDetails] = useState({ number: "", expiry: "", cvv: "" });
  const [selectedBank, setSelectedBank] = useState("sbi");

  // Loading States
  const [loadingMessage, setLoadingMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Completed Order State
  const [confirmedOrder, setConfirmedOrder] = useState(null);
  const [createdOrderMeta, setCreatedOrderMeta] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  // Auto-populate saved customer details if available
  useEffect(() => {
    const savedCustomer = localStorage.getItem("sk_customer_info");
    if (savedCustomer) {
      try {
        const parsed = JSON.parse(savedCustomer);
        setCustomer((prev) => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error(e);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Pricing calculations
  const totalItemsCount = (cart || []).reduce((s, i) => s + (i.quantity || 1), 0);
  const subtotal = (cart || []).reduce((s, i) => s + (i.product.price || 0) * (i.quantity || 1), 0);
  const isBulkDiscount = totalItemsCount >= 10;
  const bulkSavings = isBulkDiscount ? Math.round(subtotal * 0.1) : 0;
  const discountedSubtotal = Math.max(0, subtotal - bulkSavings);
  const deliveryCharge = discountedSubtotal >= 500 ? 0 : 50;
  const grandTotal = discountedSubtotal + deliveryCharge;

  // Validation Logic
  const validateField = (field, value) => {
    let error = "";
    switch (field) {
      case "name":
        if (!value || !value.trim()) {
          error = language === "mr" ? "कृपया पूर्ण नाव टाका" : "Full Name is required";
        } else if (value.trim().length < 2) {
          error = language === "mr" ? "नाव किमान २ अक्षरांचे असावे" : "Name must be at least 2 characters";
        }
        break;
      case "mobile":
        if (!value || !value.trim()) {
          error = language === "mr" ? "मोबाईल नंबर आवश्यक आहे" : "Mobile number is required";
        } else if (!/^[6-9]\d{9}$/.test(value.trim())) {
          error = language === "mr" ? "१० अंकी वैध भारतीय मोबाईल नंबर टाका" : "Enter a valid 10-digit Indian mobile number (e.g. 9876543210)";
        }
        break;
      case "address":
        if (!value || !value.trim()) {
          error = language === "mr" ? "वितरणाचा संपूर्ण पत्ता टाका" : "Complete delivery address is required";
        } else if (value.trim().length < 5) {
          error = language === "mr" ? "पत्ता सविस्तर लिहा (किमान ५ अक्षरे)" : "Please enter full address (min 5 characters)";
        }
        break;
      case "city":
        if (!value || !value.trim()) {
          error = language === "mr" ? "शहर / तालुका आवश्यक आहे" : "City / Taluka is required";
        }
        break;
      case "pincode":
        if (!value || !value.trim()) {
          error = language === "mr" ? "पिन कोड आवश्यक आहे" : "PIN Code is required";
        } else if (!/^[1-9]\d{5}$/.test(value.trim())) {
          error = language === "mr" ? "६ अंकी वैध पिन कोड टाका" : "Enter a valid 6-digit Indian PIN Code (e.g. 411001)";
        }
        break;
      default:
        break;
    }
    return error;
  };

  const validateAll = () => {
    const newErrors = {};
    Object.keys(customer).forEach((field) => {
      if (field !== "state") {
        const err = validateField(field, customer[field]);
        if (err) newErrors[field] = err;
      }
    });
    setErrors(newErrors);
    setTouched({
      name: true,
      mobile: true,
      address: true,
      city: true,
      pincode: true
    });
    return Object.keys(newErrors).length === 0;
  };

  const isFormValid =
    customer.name.trim().length >= 2 &&
    /^[6-9]\d{9}$/.test(customer.mobile.trim()) &&
    customer.address.trim().length >= 5 &&
    customer.city.trim().length >= 2 &&
    /^[1-9]\d{5}$/.test(customer.pincode.trim());

  const handleInputChange = (field, value) => {
    let sanitizedValue = value;
    if (field === "mobile") {
      sanitizedValue = value.replace(/\D/g, "").slice(0, 10);
    } else if (field === "pincode") {
      sanitizedValue = value.replace(/\D/g, "").slice(0, 6);
    }

    setCustomer((prev) => ({ ...prev, [field]: sanitizedValue }));
    if (touched[field]) {
      const err = validateField(field, sanitizedValue);
      setErrors((prev) => ({ ...prev, [field]: err }));
    }
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const err = validateField(field, customer[field]);
    setErrors((prev) => ({ ...prev, [field]: err }));
  };

  // Step 1 -> Step 2
  const handleProceedToReview = (e) => {
    e.preventDefault();
    if (!validateAll()) return;
    localStorage.setItem("sk_customer_info", JSON.stringify(customer));
    setStep("review");
  };

  // Step 2 -> Step 3
  const handleProceedToPayment = () => {
    setStep("payment");
  };

  // Trigger Razorpay / Gateway Flow
  const initiatePayment = async (selectedMethod = "Razorpay") => {
    setIsProcessing(true);
    setLoadingMessage(language === "mr" ? "ऑर्डर तयार करत आहे..." : "Creating order...");

    try {
      const payload = {
        amount: grandTotal,
        currency: "INR",
        customer,
        items: cart.map((i) => ({
          productId: i.product._id,
          name: i.product.name,
          quantity: i.quantity,
          unitPrice: i.product.price,
          unit: i.product.unit || "/kg",
          image: i.product.image || ""
        })),
        deliveryCharge
      };

      const res = await api.post("/payment/create-order", payload);
      const orderData = res.data;
      setCreatedOrderMeta(orderData);

      if (selectedMethod === "razorpay" || selectedMethod === "Razorpay") {
        setLoadingMessage(language === "mr" ? "सुरक्षित पेमेंट गेटवे उघडत आहे..." : "Opening secure payment gateway...");
        const isLoaded = await loadRazorpayScript();

        if (!isLoaded) {
          throw new Error("Unable to load Razorpay SDK. Please check your internet connection.");
        }

        const options = {
          key: orderData.keyId,
          amount: orderData.amount,
          currency: orderData.currency || "INR",
          name: "Smart Kisan Bazaar",
          description: `Order ${orderData.orderId} · ${totalItemsCount} items`,
          image: "https://cdn-icons-png.flaticon.com/512/2917/2917995.png",
          order_id: orderData.razorpayOrderId.startsWith("order_test_") ? undefined : orderData.razorpayOrderId,
          prefill: {
            name: customer.name,
            contact: customer.mobile,
            email: "farmer@smartkisan.gov.in"
          },
          notes: {
            address: `${customer.address}, ${customer.city}, ${customer.pincode}`,
            order_id: orderData.orderId
          },
          theme: {
            color: "#0d9488"
          },
          handler: async (response) => {
            await handlePaymentVerification({
              razorpay_order_id: response.razorpay_order_id || orderData.razorpayOrderId,
              razorpay_payment_id: response.razorpay_payment_id || `pay_${Date.now()}`,
              razorpay_signature: response.razorpay_signature || "simulated_sig",
              internalOrderId: orderData.orderId,
              customer,
              items: orderData.items,
              paymentMethod: "Razorpay"
            });
          },
          modal: {
            ondismiss: () => {
              setIsProcessing(false);
              setStep("failed");
              setErrorMessage(language === "mr" ? "पेमेंट रद्द करण्यात आले." : "Payment was cancelled. You can retry anytime.");
            }
          }
        };

        const rzp = new window.Razorpay(options);
        rzp.on("payment.failed", (response) => {
          setIsProcessing(false);
          setStep("failed");
          setErrorMessage(response.error?.description || "Payment failed at bank.");
        });
        rzp.open();
        setIsProcessing(false);
      } else {
        // Direct simulation for UPI / Cards / NetBanking
        await new Promise((resolve) => setTimeout(resolve, 1600));
        await handlePaymentVerification({
          razorpay_order_id: orderData.razorpayOrderId,
          razorpay_payment_id: `pay_${selectedMethod.toLowerCase()}_${Date.now()}`,
          razorpay_signature: "simulated_signature",
          internalOrderId: orderData.orderId,
          customer,
          items: orderData.items,
          paymentMethod: selectedMethod
        });
      }
    } catch (err) {
      console.error(err);
      setIsProcessing(false);
      setStep("failed");
      setErrorMessage(err.response?.data?.error || err.message || "Failed to initialize payment.");
    }
  };

  // Verify Payment on Backend
  const handlePaymentVerification = async (verifyPayload) => {
    setIsProcessing(true);
    setLoadingMessage(language === "mr" ? "पेमेंट पडताळणी व ऑर्डर अंतिम करत आहे..." : "Verifying payment & finalizing order...");

    try {
      const res = await api.post("/payment/verify", verifyPayload);
      const data = res.data;

      if (data.success && data.order) {
        setConfirmedOrder(data.order);
        setStep("success");
        onClearCart();

        // Record in Activity History
        addHistoryEntry({
          type: "marketplace",
          title: language === "mr" ? "बाजार खरेदी (यशस्वी)" : "Kisan Bazaar Order Placed",
          icon: "🛍️",
          summary: `Order ${data.order.orderId} · ₹${data.order.totalAmount} · Paid via ${data.order.paymentMethod}`,
          data: {
            orderId: data.order.orderId,
            items: data.order.items.length,
            totalAmount: `₹${data.order.totalAmount}`,
            deliveredTo: `${customer.name}, ${customer.city}`
          }
        });

        if (onOrderSuccess) onOrderSuccess(data.order);
      } else {
        throw new Error(data.error || "Payment verification failed.");
      }
    } catch (err) {
      console.error(err);
      setStep("failed");
      setErrorMessage(err.response?.data?.error || "Payment verification failed. Please contact support.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(6px)",
        zIndex: 1500,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "16px"
      }}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "20px",
          width: "100%",
          maxWidth: step === "details" || step === "review" ? "860px" : "620px",
          maxHeight: "92vh",
          overflowY: "auto",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          animation: "modalFadeIn 0.25s ease-out"
        }}
      >
        {/* Top Header */}
        <div
          style={{
            background: "linear-gradient(135deg, #064e3b 0%, #065f46 50%, #0f766e 100%)",
            padding: "20px 24px",
            borderTopLeftRadius: "20px",
            borderTopRightRadius: "20px",
            color: "#ffffff",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "28px" }}>
              {step === "success" ? "🎉" : step === "failed" ? "⚠️" : "🛒"}
            </span>
            <div>
              <h3 style={{ margin: 0, fontSize: "19px", fontWeight: "800", letterSpacing: "-0.02em" }}>
                {step === "details" && (language === "mr" ? "वितरण माहिती (Delivery Information)" : "Delivery Information")}
                {step === "review" && (language === "mr" ? "ऑर्डर पुनरावलोकन (Order Review)" : "Review Your Order")}
                {step === "payment" && (language === "mr" ? "सुरक्षित पेमेंट (Secure Payment)" : "Secure Payment")}
                {step === "success" && (language === "mr" ? "ऑर्डर यशस्वी झाली! 🎉" : "Order Placed Successfully! 🎉")}
                {step === "failed" && (language === "mr" ? "पेमेंट अयशस्वी / रद्द" : "Payment Failed / Cancelled")}
              </h3>
              <p style={{ margin: "2px 0 0", fontSize: "12px", opacity: 0.85 }}>
                {step === "details" && "Enter your details to receive your Kisan Bazaar order."}
                {step === "review" && "Verify items and address before making payment."}
                {step === "payment" && `Amount Payable: ₹${grandTotal.toLocaleString("en-IN")}`}
                {step === "success" && "Thank you for shopping with Smart Kisan Bazaar."}
                {step === "failed" && "Your cart has been preserved. You can try again."}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isProcessing}
            style={{
              background: "rgba(255, 255, 255, 0.15)",
              border: "none",
              borderRadius: "50%",
              width: "36px",
              height: "36px",
              color: "#ffffff",
              fontSize: "18px",
              cursor: isProcessing ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background 0.2s"
            }}
          >
            ✕
          </button>
        </div>

        {/* Wizard Step Progress Indicator */}
        {step !== "success" && step !== "failed" && (
          <div
            style={{
              display: "flex",
              borderBottom: "1px solid #e2e8f0",
              backgroundColor: "#f8fafc",
              fontSize: "12px",
              fontWeight: 700
            }}
          >
            <div
              style={{
                flex: 1,
                padding: "10px 12px",
                textAlign: "center",
                color: step === "details" ? "#047857" : "#059669",
                borderBottom: step === "details" ? "3px solid #047857" : "3px solid #10b981",
                backgroundColor: step === "details" ? "#ecfdf5" : "transparent"
              }}
            >
              1. {language === "mr" ? "पत्ता" : "Address"}
            </div>
            <div
              style={{
                flex: 1,
                padding: "10px 12px",
                textAlign: "center",
                color: step === "review" ? "#047857" : step === "payment" ? "#059669" : "#94a3b8",
                borderBottom: step === "review" ? "3px solid #047857" : step === "payment" ? "3px solid #10b981" : "3px solid transparent",
                backgroundColor: step === "review" ? "#ecfdf5" : "transparent"
              }}
            >
              2. {language === "mr" ? "पुनरावलोकन" : "Review"}
            </div>
            <div
              style={{
                flex: 1,
                padding: "10px 12px",
                textAlign: "center",
                color: step === "payment" ? "#047857" : "#94a3b8",
                borderBottom: step === "payment" ? "3px solid #047857" : "3px solid transparent",
                backgroundColor: step === "payment" ? "#ecfdf5" : "transparent"
              }}
            >
              3. {language === "mr" ? "पेमेंट" : "Payment"}
            </div>
          </div>
        )}

        {/* Loading Overlay */}
        {isProcessing && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(255, 255, 255, 0.92)",
              zIndex: 200,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "16px",
              borderRadius: "20px"
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                border: "4px solid #e2e8f0",
                borderTop: "4px solid #0d9488",
                borderRadius: "50%",
                animation: "spin 0.9s linear infinite"
              }}
            />
            <strong style={{ color: "#064e3b", fontSize: "16px" }}>{loadingMessage}</strong>
            <span style={{ fontSize: "12px", color: "#64748b" }}>Please do not refresh or close this window.</span>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            STEP 1: CUSTOMER DELIVERY DETAILS FORM
        ───────────────────────────────────────────────────────────── */}
        {step === "details" && (
          <div
            style={{
              padding: "24px",
              display: "grid",
              gridTemplateColumns: "1.3fr 1fr",
              gap: "24px",
              alignItems: "start"
            }}
          >
            {/* Form Column */}
            <form onSubmit={handleProceedToReview} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: "8px" }}>
                <strong style={{ fontSize: "14px", color: "#0f172a" }}>
                  👤 {language === "mr" ? "ग्राहक व वितरकाचा तपशील" : "Customer Contact & Address"}
                </strong>
              </div>

              {/* Full Name */}
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#334155", marginBottom: "4px" }}>
                  {language === "mr" ? "पूर्ण नाव *" : "Full Name *"}
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Shankar Patil"
                  value={customer.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  onBlur={() => handleBlur("name")}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: errors.name ? "1.5px solid #ef4444" : "1.5px solid #cbd5e1",
                    fontSize: "14px",
                    outline: "none",
                    boxSizing: "border-box"
                  }}
                />
                {errors.name && <span style={{ fontSize: "11px", color: "#ef4444", marginTop: "3px", display: "block" }}>{errors.name}</span>}
              </div>

              {/* Mobile Number */}
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#334155", marginBottom: "4px" }}>
                  {language === "mr" ? "मोबाईल नंबर (१० अंकी) *" : "Mobile Number (10 Digits) *"}
                </label>
                <div style={{ display: "flex", gap: "6px" }}>
                  <span
                    style={{
                      padding: "10px 12px",
                      background: "#f1f5f9",
                      border: "1.5px solid #cbd5e1",
                      borderRadius: "8px",
                      fontSize: "13px",
                      fontWeight: "700",
                      color: "#475569"
                    }}
                  >
                    +91
                  </span>
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="9876543210"
                    value={customer.mobile}
                    onChange={(e) => handleInputChange("mobile", e.target.value)}
                    onBlur={() => handleBlur("mobile")}
                    style={{
                      flex: 1,
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: errors.mobile ? "1.5px solid #ef4444" : "1.5px solid #cbd5e1",
                      fontSize: "14px",
                      outline: "none",
                      boxSizing: "border-box"
                    }}
                  />
                </div>
                {errors.mobile && <span style={{ fontSize: "11px", color: "#ef4444", marginTop: "3px", display: "block" }}>{errors.mobile}</span>}
              </div>

              {/* Complete Address */}
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#334155", marginBottom: "4px" }}>
                  {language === "mr" ? "संपूर्ण पत्ता (घर क्र., रस्ता, खेड्याचे नाव) *" : "Complete Delivery Address (House No, Street, Village) *"}
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Gat No. 45, Near Hanuman Mandir, Vadgaon"
                  value={customer.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  onBlur={() => handleBlur("address")}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: errors.address ? "1.5px solid #ef4444" : "1.5px solid #cbd5e1",
                    fontSize: "13px",
                    outline: "none",
                    resize: "none",
                    boxSizing: "border-box",
                    fontFamily: "inherit"
                  }}
                />
                {errors.address && <span style={{ fontSize: "11px", color: "#ef4444", marginTop: "3px", display: "block" }}>{errors.address}</span>}
              </div>

              {/* City + PIN Code */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#334155", marginBottom: "4px" }}>
                    {language === "mr" ? "शहर / तालुका *" : "City / Taluka *"}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Kolhapur"
                    value={customer.city}
                    onChange={(e) => handleInputChange("city", e.target.value)}
                    onBlur={() => handleBlur("city")}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: errors.city ? "1.5px solid #ef4444" : "1.5px solid #cbd5e1",
                      fontSize: "14px",
                      outline: "none",
                      boxSizing: "border-box"
                    }}
                  />
                  {errors.city && <span style={{ fontSize: "11px", color: "#ef4444", marginTop: "3px", display: "block" }}>{errors.city}</span>}
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#334155", marginBottom: "4px" }}>
                    {language === "mr" ? "पिन कोड (६ अंकी) *" : "PIN Code (6 Digits) *"}
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="416001"
                    value={customer.pincode}
                    onChange={(e) => handleInputChange("pincode", e.target.value)}
                    onBlur={() => handleBlur("pincode")}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: errors.pincode ? "1.5px solid #ef4444" : "1.5px solid #cbd5e1",
                      fontSize: "14px",
                      outline: "none",
                      boxSizing: "border-box"
                    }}
                  />
                  {errors.pincode && <span style={{ fontSize: "11px", color: "#ef4444", marginTop: "3px", display: "block" }}>{errors.pincode}</span>}
                </div>
              </div>

              {/* State Select */}
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#334155", marginBottom: "4px" }}>
                  {language === "mr" ? "राज्य *" : "State *"}
                </label>
                <select
                  value={customer.state}
                  onChange={(e) => setCustomer((prev) => ({ ...prev, state: e.target.value }))}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "1.5px solid #cbd5e1",
                    fontSize: "14px",
                    outline: "none",
                    backgroundColor: "#ffffff",
                    boxSizing: "border-box"
                  }}
                >
                  {INDIAN_STATES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    flex: 1,
                    padding: "12px 16px",
                    borderRadius: "10px",
                    border: "1.5px solid #cbd5e1",
                    backgroundColor: "#ffffff",
                    color: "#475569",
                    fontWeight: "700",
                    fontSize: "14px",
                    cursor: "pointer"
                  }}
                >
                  ← {language === "mr" ? "कार्टवर परत जा" : "Back to Cart"}
                </button>
                <button
                  type="submit"
                  disabled={!isFormValid}
                  style={{
                    flex: 1.5,
                    padding: "12px 20px",
                    borderRadius: "10px",
                    border: "none",
                    background: isFormValid
                      ? "linear-gradient(135deg, #059669 0%, #0d9488 100%)"
                      : "#cbd5e1",
                    color: "#ffffff",
                    fontWeight: "800",
                    fontSize: "14px",
                    cursor: isFormValid ? "pointer" : "not-allowed",
                    boxShadow: isFormValid ? "0 4px 12px rgba(5, 150, 105, 0.3)" : "none",
                    transition: "all 0.2s"
                  }}
                >
                  {language === "mr" ? "पुढे चालू ठेवा →" : "Continue to Payment →"}
                </button>
              </div>
            </form>

            {/* Cart Summary Column (Sticky Right) */}
            <div
              style={{
                backgroundColor: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "14px",
                padding: "18px",
                display: "flex",
                flexDirection: "column",
                gap: "14px"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", paddingBottom: "8px" }}>
                <strong style={{ fontSize: "14px", color: "#0f172a" }}>
                  🛍️ {language === "mr" ? "खरेदी सारांश" : "Cart Summary"} ({totalItemsCount})
                </strong>
                <span style={{ fontSize: "11px", color: "#059669", fontWeight: "700" }}>Kisan Logistics</span>
              </div>

              {/* Items List */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "240px", overflowY: "auto" }}>
                {cart.map((item) => (
                  <div
                    key={item.product._id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      backgroundColor: "#ffffff",
                      padding: "8px 10px",
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0"
                    }}
                  >
                    <img
                      src={item.product.image || "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=120&q=80"}
                      alt={item.product.name}
                      style={{ width: "42px", height: "42px", borderRadius: "6px", objectFit: "cover" }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#1e293b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {item.product.name}
                      </span>
                      <span style={{ fontSize: "11px", color: "#64748b" }}>
                        ₹{item.product.price} × {item.quantity}
                      </span>
                    </div>
                    <strong style={{ fontSize: "13px", color: "#0f172a" }}>
                      ₹{(item.product.price * item.quantity).toLocaleString("en-IN")}
                    </strong>
                  </div>
                ))}
              </div>

              {/* Cost Calculations */}
              <div style={{ borderTop: "1px dashed #cbd5e1", paddingTop: "10px", display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#475569" }}>
                  <span>{language === "mr" ? "वस्तूंची किंमत (Items Total)" : "Items Subtotal"}</span>
                  <span>₹{subtotal.toLocaleString("en-IN")}</span>
                </div>

                {bulkSavings > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", color: "#059669", fontWeight: "700" }}>
                    <span>🌾 {language === "mr" ? "थोक सवलत (१०% Bulk)" : "Bulk Discount (10%)"}</span>
                    <span>-₹{bulkSavings.toLocaleString("en-IN")}</span>
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "space-between", color: "#475569" }}>
                  <span>{language === "mr" ? "डिलिव्हरी शुल्क" : "Delivery Charge"}</span>
                  <span style={{ color: deliveryCharge === 0 ? "#059669" : "#475569", fontWeight: deliveryCharge === 0 ? "700" : "normal" }}>
                    {deliveryCharge === 0 ? (language === "mr" ? "मोफत (FREE)" : "FREE") : `₹${deliveryCharge}`}
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "16px",
                    fontWeight: "800",
                    color: "#0f172a",
                    borderTop: "1.5px solid #cbd5e1",
                    paddingTop: "8px",
                    marginTop: "4px"
                  }}
                >
                  <span>{language === "mr" ? "एकूण रक्कम (Grand Total)" : "Grand Total"}</span>
                  <span style={{ color: "#047857" }}>₹{grandTotal.toLocaleString("en-IN")}</span>
                </div>
              </div>

              <div style={{ background: "#ecfdf5", padding: "8px 10px", borderRadius: "6px", fontSize: "11px", color: "#065f46", display: "flex", alignItems: "center", gap: "6px" }}>
                <span>🔒</span>
                <span>Bank-grade 256-bit SSL encrypted secure checkout.</span>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            STEP 2: ORDER REVIEW
        ───────────────────────────────────────────────────────────── */}
        {step === "review" && (
          <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Customer Details Card */}
            <div
              style={{
                backgroundColor: "#f8fafc",
                border: "1.5px solid #e2e8f0",
                borderRadius: "14px",
                padding: "16px 20px"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <strong style={{ fontSize: "14px", color: "#0f172a", display: "flex", alignItems: "center", gap: "6px" }}>
                  📍 {language === "mr" ? "वितरण तपशील (Customer & Delivery)" : "Delivery Details"}
                </strong>
                <button
                  type="button"
                  onClick={() => setStep("details")}
                  style={{
                    background: "transparent",
                    border: "1px solid #0d9488",
                    color: "#0d9488",
                    padding: "4px 12px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: "700",
                    cursor: "pointer"
                  }}
                >
                  ✏️ {language === "mr" ? "बदला (Edit)" : "Edit Details"}
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "13px", color: "#334155" }}>
                <div>
                  <span style={{ color: "#64748b", display: "block", fontSize: "11px", textTransform: "uppercase", fontWeight: "700" }}>Name</span>
                  <strong>{customer.name}</strong>
                </div>
                <div>
                  <span style={{ color: "#64748b", display: "block", fontSize: "11px", textTransform: "uppercase", fontWeight: "700" }}>Mobile</span>
                  <strong>+91 {customer.mobile}</strong>
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <span style={{ color: "#64748b", display: "block", fontSize: "11px", textTransform: "uppercase", fontWeight: "700" }}>Delivery Address</span>
                  <span>{customer.address}, {customer.city}, {customer.state} — <strong>{customer.pincode}</strong></span>
                </div>
              </div>
            </div>

            {/* Products Card */}
            <div
              style={{
                backgroundColor: "#ffffff",
                border: "1.5px solid #e2e8f0",
                borderRadius: "14px",
                padding: "16px 20px"
              }}
            >
              <strong style={{ fontSize: "14px", color: "#0f172a", display: "block", marginBottom: "12px" }}>
                📦 {language === "mr" ? "ऑर्डरमधील उत्पादने" : "Order Items"} ({totalItemsCount})
              </strong>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {cart.map((item) => (
                  <div
                    key={item.product._id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingBottom: "10px",
                      borderBottom: "1px solid #f1f5f9"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <img
                        src={item.product.image || "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=120&q=80"}
                        alt={item.product.name}
                        style={{ width: "48px", height: "48px", borderRadius: "8px", objectFit: "cover" }}
                      />
                      <div>
                        <strong style={{ fontSize: "14px", color: "#0f172a", display: "block" }}>{item.product.name}</strong>
                        <span style={{ fontSize: "12px", color: "#64748b" }}>
                          Qty: <strong>{item.quantity}</strong> × ₹{item.product.price} {item.product.unit}
                        </span>
                      </div>
                    </div>
                    <strong style={{ fontSize: "15px", color: "#0f172a" }}>
                      ₹{(item.product.price * item.quantity).toLocaleString("en-IN")}
                    </strong>
                  </div>
                ))}
              </div>

              {/* Total Calculation */}
              <div style={{ marginTop: "14px", display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#475569" }}>
                  <span>Subtotal</span>
                  <span>₹{subtotal.toLocaleString("en-IN")}</span>
                </div>
                {bulkSavings > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", color: "#059669", fontWeight: "700" }}>
                    <span>Bulk Discount (10%)</span>
                    <span>-₹{bulkSavings.toLocaleString("en-IN")}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", color: "#475569" }}>
                  <span>Delivery Fee</span>
                  <span>{deliveryCharge === 0 ? "FREE" : `₹${deliveryCharge}`}</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "17px",
                    fontWeight: "800",
                    color: "#0f172a",
                    borderTop: "1.5px solid #e2e8f0",
                    paddingTop: "10px",
                    marginTop: "6px"
                  }}
                >
                  <span>{language === "mr" ? "एकूण देय रक्कम" : "Final Payable Amount"}</span>
                  <span style={{ color: "#047857" }}>₹{grandTotal.toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div style={{ display: "flex", gap: "12px" }}>
              <button
                type="button"
                onClick={() => setStep("details")}
                style={{
                  flex: 1,
                  padding: "14px 20px",
                  borderRadius: "10px",
                  border: "1.5px solid #cbd5e1",
                  backgroundColor: "#ffffff",
                  color: "#475569",
                  fontWeight: "700",
                  fontSize: "14px",
                  cursor: "pointer"
                }}
              >
                ← {language === "mr" ? "पत्ता बदला" : "Edit Details"}
              </button>
              <button
                type="button"
                onClick={handleProceedToPayment}
                style={{
                  flex: 1.6,
                  padding: "14px 24px",
                  borderRadius: "10px",
                  border: "none",
                  background: "linear-gradient(135deg, #059669 0%, #0d9488 100%)",
                  color: "#ffffff",
                  fontWeight: "800",
                  fontSize: "15px",
                  cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(5, 150, 105, 0.35)"
                }}
              >
                🔒 {language === "mr" ? "पेमेंट करण्यासाठी पुढे जा" : "Proceed to Payment →"}
              </button>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            STEP 3: PAYMENT OPTIONS & RAZORPAY GATEWAY
        ───────────────────────────────────────────────────────────── */}
        {step === "payment" && (
          <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Amount Banner */}
            <div
              style={{
                background: "linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)",
                border: "1.5px solid #a7f3d0",
                borderRadius: "12px",
                padding: "14px 20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}
            >
              <div>
                <span style={{ fontSize: "11px", textTransform: "uppercase", fontWeight: "700", color: "#065f46", display: "block" }}>
                  Payable for Kisan Bazaar Order
                </span>
                <strong style={{ fontSize: "14px", color: "#0f172a" }}>{customer.name} ({customer.city})</strong>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: "11px", color: "#065f46", display: "block" }}>Total Amount</span>
                <strong style={{ fontSize: "22px", color: "#047857" }}>₹{grandTotal.toLocaleString("en-IN")}</strong>
              </div>
            </div>

            {/* Payment Method Selector Tabs */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <label style={{ fontSize: "13px", fontWeight: "700", color: "#334155" }}>
                {language === "mr" ? "पेमेंट पर्याय निवडा" : "Select Payment Method"}
              </label>

              {/* Option 1: Razorpay All-in-One (Recommended) */}
              <div
                onClick={() => setPaymentMethod("razorpay")}
                style={{
                  border: paymentMethod === "razorpay" ? "2px solid #0d9488" : "1.5px solid #e2e8f0",
                  backgroundColor: paymentMethod === "razorpay" ? "#f0fdfa" : "#ffffff",
                  borderRadius: "12px",
                  padding: "14px 16px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  transition: "all 0.2s"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <input
                    type="radio"
                    name="payment_choice"
                    checked={paymentMethod === "razorpay"}
                    onChange={() => setPaymentMethod("razorpay")}
                    style={{ accentColor: "#0d9488", width: "18px", height: "18px" }}
                  />
                  <div>
                    <strong style={{ fontSize: "14px", color: "#0f172a", display: "block" }}>
                      ⚡ Razorpay Gateway (Recommended)
                    </strong>
                    <span style={{ fontSize: "12px", color: "#64748b" }}>
                      UPI (GPay, PhonePe, Paytm), All Debit/Credit Cards, Net Banking & Wallets
                    </span>
                  </div>
                </div>
                <span style={{ fontSize: "10px", fontWeight: "800", color: "#047857", backgroundColor: "#d1fae5", padding: "3px 8px", borderRadius: "12px" }}>
                  FAST & SECURE
                </span>
              </div>

              {/* Option 2: Direct UPI */}
              <div
                onClick={() => setPaymentMethod("upi")}
                style={{
                  border: paymentMethod === "upi" ? "2px solid #0d9488" : "1.5px solid #e2e8f0",
                  backgroundColor: paymentMethod === "upi" ? "#f0fdfa" : "#ffffff",
                  borderRadius: "12px",
                  padding: "14px 16px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  transition: "all 0.2s"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <input
                    type="radio"
                    name="payment_choice"
                    checked={paymentMethod === "upi"}
                    onChange={() => setPaymentMethod("upi")}
                    style={{ accentColor: "#0d9488", width: "18px", height: "18px" }}
                  />
                  <div>
                    <strong style={{ fontSize: "14px", color: "#0f172a", display: "block" }}>
                      📱 BHIM UPI / QR Code
                    </strong>
                    <span style={{ fontSize: "12px", color: "#64748b" }}>
                      Instant payment via UPI ID or Bharat QR
                    </span>
                  </div>
                </div>
              </div>

              {/* Option 3: Credit/Debit Card */}
              <div
                onClick={() => setPaymentMethod("cards")}
                style={{
                  border: paymentMethod === "cards" ? "2px solid #0d9488" : "1.5px solid #e2e8f0",
                  backgroundColor: paymentMethod === "cards" ? "#f0fdfa" : "#ffffff",
                  borderRadius: "12px",
                  padding: "14px 16px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  transition: "all 0.2s"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <input
                    type="radio"
                    name="payment_choice"
                    checked={paymentMethod === "cards"}
                    onChange={() => setPaymentMethod("cards")}
                    style={{ accentColor: "#0d9488", width: "18px", height: "18px" }}
                  />
                  <div>
                    <strong style={{ fontSize: "14px", color: "#0f172a", display: "block" }}>
                      💳 Credit / Debit Card
                    </strong>
                    <span style={{ fontSize: "12px", color: "#64748b" }}>
                      RuPay, Visa, MasterCard, Maestro
                    </span>
                  </div>
                </div>
              </div>

              {/* Option 4: Net Banking */}
              <div
                onClick={() => setPaymentMethod("netbanking")}
                style={{
                  border: paymentMethod === "netbanking" ? "2px solid #0d9488" : "1.5px solid #e2e8f0",
                  backgroundColor: paymentMethod === "netbanking" ? "#f0fdfa" : "#ffffff",
                  borderRadius: "12px",
                  padding: "14px 16px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  transition: "all 0.2s"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <input
                    type="radio"
                    name="payment_choice"
                    checked={paymentMethod === "netbanking"}
                    onChange={() => setPaymentMethod("netbanking")}
                    style={{ accentColor: "#0d9488", width: "18px", height: "18px" }}
                  />
                  <div>
                    <strong style={{ fontSize: "14px", color: "#0f172a", display: "block" }}>
                      🏛️ Net Banking
                    </strong>
                    <span style={{ fontSize: "12px", color: "#64748b" }}>
                      SBI, HDFC, ICICI, Axis, Bank of Maharashtra & 50+ Banks
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Details Subform based on selection */}
            {paymentMethod === "upi" && (
              <div style={{ background: "#f8fafc", padding: "14px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "4px" }}>Enter Virtual Payment Address (VPA / UPI ID)</label>
                <input
                  type="text"
                  placeholder="e.g. yourname@okaxis, mobile@upi"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1.5px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
                />
              </div>
            )}

            {paymentMethod === "cards" && (
              <div style={{ background: "#f8fafc", padding: "14px", borderRadius: "10px", border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", gap: "8px" }}>
                <input
                  type="text"
                  placeholder="Card Number (xxxx xxxx xxxx xxxx)"
                  maxLength={19}
                  value={cardDetails.number}
                  onChange={(e) => setCardDetails((p) => ({ ...p, number: e.target.value }))}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1.5px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
                />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <input
                    type="text"
                    placeholder="MM/YY"
                    maxLength={5}
                    value={cardDetails.expiry}
                    onChange={(e) => setCardDetails((p) => ({ ...p, expiry: e.target.value }))}
                    style={{ padding: "10px 12px", borderRadius: "6px", border: "1.5px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
                  />
                  <input
                    type="password"
                    placeholder="CVV"
                    maxLength={3}
                    value={cardDetails.cvv}
                    onChange={(e) => setCardDetails((p) => ({ ...p, cvv: e.target.value }))}
                    style={{ padding: "10px 12px", borderRadius: "6px", border: "1.5px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
                  />
                </div>
              </div>
            )}

            {paymentMethod === "netbanking" && (
              <div style={{ background: "#f8fafc", padding: "14px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "4px" }}>Select Bank</label>
                <select
                  value={selectedBank}
                  onChange={(e) => setSelectedBank(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1.5px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
                >
                  <option value="sbi">State Bank of India (SBI)</option>
                  <option value="hdfc">HDFC Bank</option>
                  <option value="icici">ICICI Bank</option>
                  <option value="axis">Axis Bank</option>
                  <option value="bom">Bank of Maharashtra</option>
                  <option value="pnb">Punjab National Bank</option>
                </select>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: "flex", gap: "12px" }}>
              <button
                type="button"
                onClick={() => setStep("review")}
                style={{
                  flex: 1,
                  padding: "14px 18px",
                  borderRadius: "10px",
                  border: "1.5px solid #cbd5e1",
                  backgroundColor: "#ffffff",
                  color: "#475569",
                  fontWeight: "700",
                  fontSize: "14px",
                  cursor: "pointer"
                }}
              >
                ← {language === "mr" ? "पुनरावलोकन" : "Back to Review"}
              </button>
              <button
                type="button"
                onClick={() => initiatePayment(paymentMethod === "razorpay" ? "Razorpay" : paymentMethod.toUpperCase())}
                style={{
                  flex: 1.6,
                  padding: "14px 24px",
                  borderRadius: "10px",
                  border: "none",
                  background: "linear-gradient(135deg, #059669 0%, #0d9488 100%)",
                  color: "#ffffff",
                  fontWeight: "800",
                  fontSize: "15px",
                  cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(5, 150, 105, 0.35)"
                }}
              >
                ⚡ {language === "mr" ? `₹${grandTotal} चे पेमेंट करा` : `Pay ₹${grandTotal.toLocaleString("en-IN")}`}
              </button>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            STEP 4: ORDER CONFIRMATION (SUCCESS)
        ───────────────────────────────────────────────────────────── */}
        {step === "success" && confirmedOrder && (
          <div style={{ padding: "32px 24px", textAlign: "center", display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ fontSize: "64px", animation: "bounce 0.8s ease" }}>🎉</div>
            <div>
              <h2 style={{ margin: "0 0 6px 0", color: "#065f46", fontSize: "24px", fontWeight: "900" }}>
                Order Placed Successfully!
              </h2>
              <p style={{ margin: 0, color: "#475569", fontSize: "14px" }}>
                Thank you for shopping with <strong>Smart Kisan Bazaar</strong>.
              </p>
            </div>

            {/* Order Details Card */}
            <div
              style={{
                backgroundColor: "#f8fafc",
                border: "1.5px solid #cbd5e1",
                borderRadius: "14px",
                padding: "18px 20px",
                textAlign: "left",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                fontSize: "13px"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #e2e8f0", paddingBottom: "8px" }}>
                <div>
                  <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: "700", display: "block" }}>Order ID</span>
                  <strong style={{ fontSize: "15px", color: "#0f172a", fontFamily: "monospace" }}>{confirmedOrder.orderId}</strong>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: "700", display: "block" }}>Payment Ref</span>
                  <strong style={{ fontSize: "13px", color: "#0d9488", fontFamily: "monospace" }}>{confirmedOrder.razorpayPaymentId}</strong>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <div>
                  <span style={{ fontSize: "11px", color: "#64748b" }}>Customer:</span>
                  <div style={{ fontWeight: "700" }}>{confirmedOrder.customerName} ({confirmedOrder.mobile})</div>
                </div>
                <div>
                  <span style={{ fontSize: "11px", color: "#64748b" }}>Total Paid:</span>
                  <div style={{ fontWeight: "800", color: "#047857", fontSize: "15px" }}>₹{confirmedOrder.totalAmount?.toLocaleString("en-IN")}</div>
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <span style={{ fontSize: "11px", color: "#64748b" }}>Delivery Address:</span>
                  <div>{confirmedOrder.deliveryAddress}, {confirmedOrder.city}, {confirmedOrder.state} — {confirmedOrder.pincode}</div>
                </div>
              </div>

              {/* Status Badges */}
              <div style={{ display: "flex", gap: "10px", marginTop: "6px" }}>
                <span style={{ backgroundColor: "#dcfce7", color: "#166534", padding: "4px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "800" }}>
                  ✓ Payment Status: {confirmedOrder.paymentStatus || "Paid"}
                </span>
                <span style={{ backgroundColor: "#e0f2fe", color: "#0369a1", padding: "4px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "800" }}>
                  📦 Order Status: {confirmedOrder.orderStatus || "Confirmed"}
                </span>
              </div>
            </div>

            {/* Logistics info */}
            <div style={{ backgroundColor: "#ecfdf5", padding: "10px 14px", borderRadius: "8px", border: "1px solid #a7f3d0", fontSize: "12px", color: "#065f46", textAlign: "left" }}>
              🚚 <strong>Estimated Delivery:</strong> 3-5 Business Days by Kisan Logistics. A digital invoice & SMS confirmation have been sent to your mobile.
            </div>

            {/* Action Buttons */}
            <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onOpenMyOrders) onOpenMyOrders();
                }}
                style={{
                  flex: 1,
                  padding: "14px 20px",
                  borderRadius: "10px",
                  border: "1.5px solid #0d9488",
                  backgroundColor: "#f0fdfa",
                  color: "#0d9488",
                  fontWeight: "800",
                  fontSize: "14px",
                  cursor: "pointer"
                }}
              >
                📋 {language === "mr" ? "माझ्या ऑर्डर्स पहा" : "View My Orders"}
              </button>
              <button
                type="button"
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: "14px 20px",
                  borderRadius: "10px",
                  border: "none",
                  background: "linear-gradient(135deg, #059669 0%, #0d9488 100%)",
                  color: "#ffffff",
                  fontWeight: "800",
                  fontSize: "14px",
                  cursor: "pointer"
                }}
              >
                🛍️ {language === "mr" ? "खरेदी सुरू ठेवा" : "Continue Shopping"}
              </button>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            STEP 5: FAILED / CANCELLED PAYMENT
        ───────────────────────────────────────────────────────────── */}
        {step === "failed" && (
          <div style={{ padding: "32px 24px", textAlign: "center", display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ fontSize: "56px" }}>❌</div>
            <div>
              <h2 style={{ margin: "0 0 6px 0", color: "#991b1b", fontSize: "22px", fontWeight: "900" }}>
                Payment Failed or Cancelled
              </h2>
              <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>
                {errorMessage || "The transaction could not be completed. Your items are safe in your shopping cart."}
              </p>
            </div>

            <div style={{ backgroundColor: "#fef2f2", padding: "12px 16px", borderRadius: "10px", border: "1px solid #fecaca", fontSize: "13px", color: "#991b1b", textAlign: "left" }}>
              💡 <strong>Tip:</strong> Please ensure your payment details are correct and sufficient bank balance is available, or try using Razorpay UPI.
            </div>

            <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: "14px 20px",
                  borderRadius: "10px",
                  border: "1.5px solid #cbd5e1",
                  backgroundColor: "#ffffff",
                  color: "#475569",
                  fontWeight: "700",
                  fontSize: "14px",
                  cursor: "pointer"
                }}
              >
                🛒 {language === "mr" ? "कार्टवर परत जा" : "Back to Cart"}
              </button>
              <button
                type="button"
                onClick={() => setStep("payment")}
                style={{
                  flex: 1.4,
                  padding: "14px 24px",
                  borderRadius: "10px",
                  border: "none",
                  background: "linear-gradient(135deg, #059669 0%, #0d9488 100%)",
                  color: "#ffffff",
                  fontWeight: "800",
                  fontSize: "14px",
                  cursor: "pointer"
                }}
              >
                🔄 {language === "mr" ? "पुन्हा प्रयत्न करा" : "Try Again"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default KisanCheckoutModal;
