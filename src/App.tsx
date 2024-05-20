import React, { useState, ChangeEvent, useEffect } from "react";
import Papa from "papaparse";
import axios from "axios";
import "./App.css";

// Allowed extensions for input file
const allowedExtensions = ["csv"];

interface ParsedData {
  [key: string]: string | undefined;
}

interface DataWithStatus extends ParsedData {
  status: string | undefined;
}

const App: React.FC = () => {
  // This state will store the parsed data with status
  const [data, setData] = useState<DataWithStatus[]>([]);

  // This state will contain the error when
  // correct file extension is not used
  const [error, setError] = useState<string>("");

  // This will store the file uploaded by the user
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (file !== null) {
      handleParse();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  // This function will be called when
  // the file input changes
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setError("");

    // Check if user has entered the file
    if (e.target.files && e.target.files.length > 0) {
      const inputFile = e.target.files[0];

      // Check the file extensions, if it's not
      // included in the allowed extensions
      // we show an error
      const fileExtension = inputFile.type.split("/")[1];
      if (!allowedExtensions.includes(fileExtension)) {
        setError("Please input a csv file");
        return;
      }

      // If input type is correct set the state
      setFile(inputFile);
    }
  };

  const handleParse = () => {
    // If user clicks the parse button without
    // a file we show an error
    if (!file) return alert("Enter a valid file");

    // Initialize a reader which allows user
    // to read any file or blob.
    const reader = new FileReader();

    // Event listener on reader when the file
    // loads, we parse it and set the data.
    reader.onload = ({ target }) => {
      if (!target) return;
      const csv = Papa.parse<ParsedData>(target.result as string, {
        header: true,
        skipEmptyLines: true,
      });
      const parsedData = csv?.data;
      if (parsedData.length === 0) return;

      // Add a status column to each record
      const dataWithStatus = parsedData.map((record) => ({
        ...record,
        status: "Pending",
      }));

      setData(dataWithStatus);
    };
    reader.readAsText(file);
  };

  const sendData = async (record: DataWithStatus, index: number) => {
    try {
      // Transform keys with double underscores into nested objects
      const transformedRecord = transformKeys(record);

      // Simulate sending data to an API
      await axios.post(
        "https://jsonplaceholder.typicode.com/posts",
        transformedRecord
      );
      updateStatus(index, "Success");
    } catch (error) {
      updateStatus(index, "Failed");
    }
  };

  const transformKeys = (record: DataWithStatus): any => {
    const transformedRecord: any = {};

    for (const key in record) {
      if (record.hasOwnProperty(key)) {
        if (key.includes("__")) {
          const [parentKey, nestedKey] = key.split("__");
          if (!transformedRecord[parentKey]) {
            transformedRecord[parentKey] = {};
          }
          transformedRecord[parentKey][nestedKey] = record[key];
        } else {
          transformedRecord[key] = record[key];
        }
      }
    }

    return transformedRecord;
  };

  const updateStatus = (index: number, status: string) => {
    setData((prevData) =>
      prevData.map((item, i) => (i === index ? { ...item, status } : item))
    );
  };

  const handleSendData = () => {
    data.forEach((record, index) => sendData(record, index));
  };

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement>,
    rowIndex: number,
    key: string
  ) => {
    const { value } = e.target;
    setData((prevData) =>
      prevData.map((item, i) =>
        i === rowIndex ? { ...item, [key]: value } : item
      )
    );
  };

  return (
    <div className="App">
      <h2>
        React TypeScript Application for CSV Data Handling and API Submission
      </h2>
      <h4>
        This sample project, built with React and TypeScript, reads data from a
        CSV file and displays it in an editable table format. The application
        includes functionality to modify the data directly within the table.
        Additionally, a button is provided to send the data via a POST API
        request.
      </h4>
      <div className="container">
        <label
          htmlFor="csvInput"
          style={{ display: "block", marginBottom: 10 }}
        >
          Choose CSV File
        </label>
        <input
          onChange={handleFileChange}
          id="csvInput"
          name="file"
          type="File"
        />
        <div style={{ marginTop: 20 }}>
          {data.length > 0 && (
            <button onClick={handleSendData}>Send Data</button>
          )}
        </div>
        <div style={{ marginTop: "3rem" }}>
          {error && <div>{error}</div>}
          {data.length > 0 && (
            <table>
              <thead>
                <tr>
                  {Object.keys(data[0])
                    .filter((key) => key !== "status")
                    .map((key, index) => (
                      <th key={index}>{key}</th>
                    ))}
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {Object.keys(row)
                      .filter((key) => key !== "status")
                      .map((key, colIndex) => (
                        <td key={colIndex}>
                          <input
                            type="text"
                            value={row[key]}
                            onChange={(e) =>
                              handleInputChange(e, rowIndex, key)
                            }
                          />
                        </td>
                      ))}
                    <td>{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
