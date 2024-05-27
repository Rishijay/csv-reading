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

  // Add asset button name
  const [addAssetButtonName, setAddAssetButtonName] =
    useState<string>("Add Assets");

  // Add asset button disbale
  const [disableAssetButtonName, setDisableAssetButtonName] =
    useState<boolean>(false);

  // This will store the file uploaded by the user
  const [file, setFile] = useState<File | null>(null);

  // This will show/hide final result button to dowload result csv
  const [showResultButton, setShowResultButton] = useState<string>("none");

  useEffect(() => {
    if (file !== null) {
      handleParse();
      setShowResultButton("none");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  // Add event listener for beforeunload to show warning dialog
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = ""; // Modern browsers require this to show the dialog
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

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

      if (
        !("Triplet Id" in (parsedData[0] as object)) ||
        !("Asset Id" in (parsedData[0] as object)) ||
        !("Asset Type" in (parsedData[0] as object))
      ) {
        setError(
          "Please input a valid csv file with Triplet Id, Asset Id, Asset Type in the file"
        );
        data.length = 0;
        setData([]);
        return;
      }

      // Add a status column to each record
      const dataWithStatus = parsedData.map((record) => ({
        ...record,
        status: "Not Started",
      }));

      setData(dataWithStatus);
    };
    reader.readAsText(file!);
  };

  const sendData = async (record: DataWithStatus, index: number) => {
    // Simulate sending data to an API
    await axios
      .post("https://jsonplaceholder.typicode.com/posts", record)
      .then(() => {
        updateStatus(index, "Success");
      })
      .catch(() => {
        updateStatus(index, "Failed");
      });

    if (index === data.length - 1) {
      setShowResultButton("inline");
      setAddAssetButtonName("Add Assets");
      setDisableAssetButtonName(false);
    }
  };

  const updateStatus = (index: number, status: string) => {
    setData((prevData) =>
      prevData.map((item, i) => (i === index ? { ...item, status } : item))
    );
  };

  const handleSendData = async () => {
    setAddAssetButtonName("Adding...");
    setDisableAssetButtonName(true);
    for (let index = 0; index < data.length; index++) {
      const record = data[index];
      if (
        record["Triplet Id"]?.trim() !== "" &&
        record["Asset Id"]?.trim() !== "" &&
        record["Asset Type "]?.trim() !== "" &&
        (record["Asset Type"]?.trim() === "SYSTEM" ||
          record["Asset Type"]?.trim() === "SUPPLIER_SERVICE" ||
          record["Asset Type"]?.trim() === "INDUSTRY_UTILITY")
      ) {
        updateStatus(index, "In Progress");
        await sendData(data[index], index);
      } else {
        updateStatus(index, "Data Incorrect");
      }
    }
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

  const handleDownloadCSV = () => {
    const csvData = [
      Object.keys(data[0]),
      ...data.map((row) => Object.values(row)),
    ];

    const csvContent =
      "data:text/csv;charset=utf-8," +
      csvData.map((e) => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "result_data.csv");
    document.body.appendChild(link); // Required for FF

    link.click();
    document.body.removeChild(link); // Clean up
  };

  const getColor = (status: string | undefined) => {
    if (status === "Success") {
      return "green";
    }
    if (status?.includes("Failed") || status?.includes("Data Incorrect")) {
      return "red";
    }
    if (status?.includes("In Progress")) {
      return "orange";
    }
    return "blue";
  };

  return (
    <div style={{ padding: 20, textAlign: "center" }}>
      <h2>
        React TypeScript Application for CSV Data Handling and API Submission
      </h2>
      <h4>
        This sample project, built with React and TypeScript, reads data from a
        CSV file and displays it in an editable table format. The application
        includes functionality to modify the data directly within the table.
        Additionally, a button is provided to send the data via a POST API
        request. You can also download as sample csv by clicking the button
        given below.
      </h4>
      <div
        style={{
          display: "block",
          justifyContent: "center",
          textAlign: "center",
        }}
      >
        <label
          htmlFor="csvInput"
          style={{ display: "block", marginTop: 30, marginBottom: 10 }}
        >
          Import CSV
        </label>
        <input
          style={{
            marginLeft: 65,
          }}
          onChange={handleFileChange}
          id="csvInput"
          name="file"
          type="File"
        />
        <div style={{ marginTop: 20 }}>
          {data.length > 0 && (
            <>
              <button
                onClick={handleSendData}
                disabled={disableAssetButtonName}
              >
                {addAssetButtonName}
              </button>
              <button
                onClick={handleDownloadCSV}
                style={{ display: showResultButton }}
              >
                Download Result CSV
              </button>
            </>
          )}
        </div>
        <div
          style={{
            marginTop: "3rem",
            display: "flex",
            justifyContent: "center",
          }}
        >
          {error ? (
            <div>{error}</div>
          ) : (
            <>
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
                        <td style={{ color: getColor(row.status) }}>
                          {row.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
