"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Upload, CheckCircle, XCircle, Loader2, AlertTriangle } from "lucide-react";
import { useSearchParams } from "next/navigation";
import React from "react";

const Page = () => {
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [instituteNames, setInstituteNames] = useState("");
  const [file, setFile] = useState(null);
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [verification, setVerification] = useState(null);

  useEffect(() => {
    const name = searchParams.get("name");
    const institute_name = searchParams.get("institute_name");
    setUsername(name || "");
    setInstituteNames(institute_name || "");
  }, [searchParams]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setResponse(null);
      setVerification(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return alert("Please select an ID card image first!");

    const formData = new FormData();
    formData.append("file", file);

    setLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/extract-text/", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      setResponse(data);

      // --- Verification Logic ---
      const extracted = data.extracted_data;
      if (extracted) {
        const age = extracted.age;
        let status = "";
        let reason = "";

        if (age !== "Not detected" && age <= 18) {
          status = "verified";
          reason = "User is under 18 years old.";
        } else if (age !== "Not detected" && age > 18) {
          status = "failed";
          reason = "User age exceeds verification threshold.";
        } else {
          status = "pending";
          reason = "Age could not be detected. Manual verification required.";
        }

        setVerification({ status, reason });
        
      }
    } catch (err) {
      console.error(err);
      alert("Error connecting to OCR API");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-50 to-white p-6">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="bg-white rounded-3xl shadow-lg p-8 w-full max-w-md text-center border border-gray-100"
      >
        <h1 className="text-3xl font-semibold text-gray-800 mb-2">
          Verify Your Student ID
        </h1>
        <p className="text-gray-500 mb-6">
          Upload your student ID card to confirm your account.
        </p>

        <div className="relative mb-5">
          <label
            htmlFor="fileUpload"
            className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-2xl p-6 cursor-pointer hover:border-blue-500 transition"
          >
            {file ? (
              <>
                <img
                  src={URL.createObjectURL(file)}
                  alt="Uploaded"
                  className="w-32 h-32 object-cover rounded-xl mb-3"
                />
                <p className="text-sm text-gray-600">{file.name}</p>
              </>
            ) : (
              <>
                <Upload className="w-10 h-10 text-blue-500 mb-2" />
                <span className="text-gray-600 text-sm">
                  Click or drag to upload your ID
                </span>
              </>
            )}
            <input
              id="fileUpload"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>

        <button
          onClick={handleUpload}
          disabled={loading}
          className="bg-blue-600 text-white w-full py-3 rounded-xl text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Extracting...
            </>
          ) : (
            "Upload & Verify"
          )}
        </button>

        {response && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 bg-blue-50 rounded-xl p-5 text-left"
          >
            <div className="flex items-center mb-3">
              <h2 className="text-lg font-semibold text-gray-800">
                Extracted Details
              </h2>
            </div>
            <p className="text-gray-700">
              <strong>Name:</strong> {response.extracted_data?.name || "—"}
            </p>
            <p className="text-gray-700">
              <strong>Institute:</strong> {response.extracted_data?.institute || "—"}
            </p>
            <p className="text-gray-700">
              <strong>DOB:</strong> {response.extracted_data?.dob || "—"}
            </p>
            <p className="text-gray-700">
              <strong>Age:</strong> {response.extracted_data?.age || "—"}
            </p>
            <p className="text-xs text-gray-500 mt-3 break-words">
              <strong>Raw Text:</strong> {response.raw_text}
            </p>
          </motion.div>
        )}

        {verification && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`mt-5 p-4 rounded-xl text-sm font-semibold flex items-center justify-center ${
              verification.status === "verified"
                ? "bg-green-100 text-green-700"
                : verification.status === "failed"
                ? "bg-red-100 text-red-700"
                : "bg-yellow-100 text-yellow-700"
            }`}
          >
            {verification.status === "verified" && <CheckCircle className="w-5 h-5 mr-2" />}
            {verification.status === "failed" && <XCircle className="w-5 h-5 mr-2" />}
            {verification.status === "pending" && <AlertTriangle className="w-5 h-5 mr-2" />}
            {verification.reason}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default Page;
