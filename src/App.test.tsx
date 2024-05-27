import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import App from "./App";

// Set up mock for axios
const mock = new MockAdapter(axios);

describe("App Component", () => {
  beforeEach(() => {
    mock.reset();
  });

  test("renders without crashing", () => {
    render(<App />);
    expect(
      screen.getByText(
        /React TypeScript Application for CSV Data Handling and API Submission/i
      )
    ).toBeInTheDocument();
  });

  test("allows file upload and parsing", async () => {
    render(<App />);

    const file = new File(
      ["Triplet Id,Asset Id,Asset Type\n1,101,SYSTEM\n2,102,SUPPLIER_SERVICE"],
      "test.csv",
      { type: "text/csv" }
    );

    const input = screen.getByLabelText(/Import CSV/i);
    fireEvent.change(input, { target: { files: [file] } });

    await screen.findByText(/Download Result CSV/i);

    // Get the table rows
    const rows = screen.getAllByRole("row");

    // Check the first row
    const firstRowInputs = within(rows[1]).getAllByRole("textbox");
    expect(firstRowInputs[0]).toHaveValue("1");
    expect(firstRowInputs[1]).toHaveValue("101");
    expect(firstRowInputs[2]).toHaveValue("SYSTEM");

    // Check the second row
    const secondRowInputs = within(rows[2]).getAllByRole("textbox");
    expect(secondRowInputs[0]).toHaveValue("2");
    expect(secondRowInputs[1]).toHaveValue("102");
    expect(secondRowInputs[2]).toHaveValue("SUPPLIER_SERVICE");
  });

  test("renders the initial elements correctly", () => {
    render(<App />);
    expect(
      screen.getByText(
        /React TypeScript Application for CSV Data Handling and API Submission/i
      )
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Import CSV/i)).toBeInTheDocument();
  });

  test("shows error for incorrect file type", () => {
    render(<App />);
    const fileInput = screen.getByLabelText(/Import CSV/i);
    const file = new File(["dummy content"], "example.txt", {
      type: "text/plain",
    });

    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(screen.getByText(/Please input a csv file/i)).toBeInTheDocument();
  });

  test("parses and displays CSV data", async () => {
    render(<App />);
    const fileInput = screen.getByLabelText(/Import CSV/i);
    const file = new File(
      ["Triplet Id,Asset Id,Asset Type\n123,456,SYSTEM"],
      "example.csv",
      { type: "text/csv" }
    );

    fireEvent.change(fileInput, { target: { files: [file] } });

    // Wait for the table to be rendered
    await screen.findByRole("table");

    // Get the table rows excluding the header row
    const rows = screen.getAllByRole("row").slice(1);

    // Check the first row
    const firstRowInputs = within(rows[0]).getAllByRole("textbox");
    expect(firstRowInputs[0]).toHaveValue("123");
    expect(firstRowInputs[1]).toHaveValue("456");
    expect(firstRowInputs[2]).toHaveValue("SYSTEM");
  });

  test("handles data submission and status updates", async () => {
    render(<App />);
    const fileInput = screen.getByLabelText(/Import CSV/i);
    const file = new File(
      ["Triplet Id,Asset Id,Asset Type\n123,456,SYSTEM"],
      "example.csv",
      { type: "text/csv" }
    );

    fireEvent.change(fileInput, { target: { files: [file] } });

    await screen.findByText(/Add Assets/i);

    mock.onPost("https://jsonplaceholder.typicode.com/posts").reply(200);

    const addButton = screen.getByText(/Add Assets/i);
    fireEvent.click(addButton);

    expect(await screen.findByText(/In Progress/i)).toBeInTheDocument();
    expect(await screen.findByText(/Success/i)).toBeInTheDocument();
  });

  test("warns the user before leaving the page", () => {
    render(<App />);

    const beforeUnloadEvent = new Event("beforeunload");
    window.dispatchEvent(beforeUnloadEvent);

    expect(beforeUnloadEvent.returnValue).toBe(true);
  });

  test("downloads the result CSV with statuses", async () => {
    render(<App />);
    const fileInput = screen.getByLabelText(/Import CSV/i);
    const file = new File(
      ["Triplet Id,Asset Id,Asset Type\n123,456,SYSTEM"],
      "example.csv",
      { type: "text/csv" }
    );

    // Upload the CSV file
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Use findByText instead of waitFor + getByText
    expect(await screen.findByText("Triplet Id")).toBeInTheDocument();

    // Simulate sending the data to enable the download button
    const addButton = screen.getByText(/Add Assets/i);
    fireEvent.click(addButton);

    // Mock the axios post call to immediately resolve
    // (axios.post as jest.Mock).mockResolvedValue({});

    // Wait for the status to update to "In Progress" and then "Success" or "Failed"
    expect(await screen.findByText(/In Progress/i)).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 2000));
    expect(screen.queryByText(/In Progress/i)).not.toBeInTheDocument();

    // Mock the creation of the link
    const createElementSpy = jest.spyOn(document, "createElement");
    const mockLink = document.createElement("a");
    const clickMock = jest.fn();

    mockLink.click = clickMock;
    createElementSpy.mockReturnValue(mockLink);

    // Simulate the download button click
    const downloadButton = screen.getByText(/Download Result CSV/i);
    fireEvent.click(downloadButton);

    // Verify the link properties and click behavior
    expect(mockLink.getAttribute("href")).toContain("data:text/csv");
    expect(mockLink.getAttribute("download")).toBe("result_data.csv");
    expect(clickMock).toHaveBeenCalled();

    // Clean up the mock
    createElementSpy.mockRestore();
  });

  test("shows error when CSV file does not contain required headers", async () => {
    render(<App />);
    const fileInput = screen.getByLabelText(/Import CSV/i);
    const invalidFile = new File(
      ["Header1,Header2,Header3\nValue1,Value2,Value3"],
      "invalid_example.csv",
      { type: "text/csv" }
    );

    // Upload the invalid CSV file
    fireEvent.change(fileInput, { target: { files: [invalidFile] } });

    // Check if the error message is displayed
    expect(
      await screen.findByText(
        "Please input a valid csv file with Triplet Id, Asset Id, Asset Type in the file"
      )
    ).toBeInTheDocument();
  });

  test("shows error when an empty CSV file is uploaded", async () => {
    render(<App />);
    const fileInput = screen.getByLabelText(/Import CSV/i);
    const emptyFile = new File([""], "empty.csv", { type: "text/csv" });

    // Upload the empty CSV file
    fireEvent.change(fileInput, { target: { files: [emptyFile] } });

    // Check if the error message is displayed
    expect(await screen.findByText("Empty file")).toBeInTheDocument();
  });

  test("shows download button at the end", async () => {
    render(<App />);
    const fileInput = screen.getByLabelText(/Import CSV/i);
    const file = new File(
      ["Triplet Id,Asset Id,Asset Type\n123,456,SYSTEM"],
      "example.csv",
      { type: "text/csv" }
    );

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText("Not Started")).toBeInTheDocument();
    });

    // Mock send data button click
    const addButton = screen.getByText(/Add Assets/i);
    fireEvent.click(addButton);

    // Check if "Adding..." button text is shown
    expect(addButton).toHaveTextContent("Adding...");

    await waitFor(() => {
      expect(screen.getByText("Failed")).toBeInTheDocument();
    });

    // Check if the UI is updated correctly
    expect(screen.getByText(/Add Assets/i)).toBeInTheDocument();
    expect(addButton).not.toBeDisabled();
    expect(screen.getByText(/Download Result CSV/i)).toHaveStyle(
      "display: inline"
    );
  });
});
