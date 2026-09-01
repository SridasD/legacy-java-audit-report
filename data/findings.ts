export type Severity = "HIGH" | "MEDIUM" | "LOW";

export type Finding = {
  id: number;
  severity: Severity;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  category: string;
  file: string;
  className: string;
  method: string;
  line: string;
  resource: string;
  problem: string;
  evidence: string;
  match: string;
  action: string;
  fixSteps: string[];
  pattern: string;
  whySafe: string;
  bestPractices?: Array<{
    tip: string;
    reason: string;
  }>;
  preserve: string[];
  risk: string;
  verify: string[];
};

const normalPath =
  "Move resource ownership into try-with-resources, or close resources in a finally block in ResultSet → PreparedStatement → Connection order.";
const jdbcPattern = `try (Connection conn = dataSource.getConnection();\n     PreparedStatement pstmt = conn.prepareStatement(sql);\n     ResultSet rs = pstmt.executeQuery()) {\n    // Preserve existing result processing\n}`;

const baseFindings: Omit<Finding, "fixSteps" | "whySafe">[] = [
  {
    id: 1,
    severity: "MEDIUM",
    confidence: "HIGH",
    category: "JDBC exception-path cleanup",
    file: "dao/CandidateDaoImpl.java",
    className: "CandidateDaoImpl",
    method: "getStudentWiseCourseDtlsByIds(...)",
    line: "8623–8653",
    resource: "ResultSet, PreparedStatement, Connection",
    problem:
      "All resources are closed at the end of the try block. Any exception before those calls bypasses cleanup because the catch block only logs the exception.",
    evidence: `ResultSet res = pstmt.executeQuery();\nif (res.next()) scmId = res.getLong("scmd_id");\nres.close();\npstmt.close();\nconn.close();`,
    match: "Matches Reference Example 2: cleanup exists only on the normal execution path.",
    action: normalPath,
    pattern: jdbcPattern,
    preserve: ["SQL and parameter order", "scmId default and return value", "Result processing"],
    risk: "Repeated failures can retain pooled connections and database cursors.",
    verify: [
      "All resources close after success",
      "All resources close when result processing throws",
      "Returned scmId is unchanged",
    ],
  },
  {
    id: 2,
    severity: "MEDIUM",
    confidence: "HIGH",
    category: "JDBC exception-path cleanup",
    file: "dao/ExamDaoImpl.java",
    className: "ExamDaoImpl",
    method: "getExamCentreCoordinatorReportByExamCentre(...) ",
    line: "3882–3910",
    resource: "ResultSet, PreparedStatement, Connection",
    problem:
      "Query and JSON-processing exceptions can skip the close calls; the catch block performs no cleanup.",
    evidence: `ResultSet res = pstmt.executeQuery();\nif (res.next()) result = new JSONArray(res.getString("ts"));\nres.close();\npstmt.close();\nconn.close();`,
    match: "Matches Reference Example 2 because JSON construction precedes normal-path-only cleanup.",
    action: normalPath,
    pattern: jdbcPattern,
    preserve: ["Coordinator report SQL", "Parameter binding", "JSON response shape"],
    risk: "Malformed JSON or database failures can leak pooled resources.",
    verify: [
      "JSON failure closes resources",
      "Query failure closes connection",
      "Response JSON is unchanged",
    ],
  },
  {
    id: 3,
    severity: "MEDIUM",
    confidence: "HIGH",
    category: "JDBC exception-path cleanup",
    file: "dao/OfficialDaoImpl.java",
    className: "OfficialDaoImpl",
    method: "getAllocatedAssignmentByCourseIdLscId(...) ",
    line: "1525–1617",
    resource: "ResultSet, PreparedStatement, Connection",
    problem:
      "Binding, execution, result retrieval, or JSONArray construction can throw before all normal-path close calls.",
    evidence: `ResultSet res = pstmt.executeQuery();\nif (res.next() && res.getString("report") != null) {\n  result = new JSONArray(res.getString("report"));\n}\nres.close(); pstmt.close(); conn.close();`,
    match: "Matches Reference Example 2: result processing can bypass cleanup.",
    action: normalPath,
    pattern: jdbcPattern,
    preserve: ["Allocation SQL", "Six parameter bindings", "Empty-result behavior"],
    risk: "Exceptions can retain a connection and server-side query resources.",
    verify: [
      "JSON failure closes resources",
      "executeQuery failure closes connection",
      "Returned array is unchanged",
    ],
  },
  {
    id: 4,
    severity: "MEDIUM",
    confidence: "HIGH",
    category: "JDBC exception-path cleanup",
    file: "dao/TransactionDaoImpl.java",
    className: "TransactionDaoImpl",
    method: "getAdmissionFeeDetails_Json(...) ",
    line: "770–797",
    resource: "ResultSet, PreparedStatement, Connection",
    problem: "JSONObject construction or database operations can throw before the normal-path cleanup calls.",
    evidence: `while (rs.next()) {\n  feeDataJson = new JSONObject(rs.getString("get_applicant_total_fee_details_by_lsc_mapper_id"));\n}\nrs.close(); pstmt.close(); conn.close();`,
    match: "Matches Reference Example 2 because result processing precedes unguarded cleanup.",
    action: normalPath,
    pattern: jdbcPattern,
    preserve: ["Database function and parameters", "JSON conversion", "Null return behavior"],
    risk: "Invalid database JSON can leak a pooled connection.",
    verify: ["Invalid JSON closes resources", "Query failure closes connection", "Valid output is unchanged"],
  },
  {
    id: 5,
    severity: "MEDIUM",
    confidence: "HIGH",
    category: "JDBC exception-path cleanup",
    file: "mps/MpsDAO.java",
    className: "MpsDAO",
    method: "getOtherExamDetailsmpStudent(...) ",
    line: "787–876",
    resource: "ResultSet, PreparedStatement, Connection",
    problem: "The catch block does not clean up resources when query execution or JSON conversion fails.",
    evidence: `ResultSet res = pstmt.executeQuery();\nif (res.next()) result = new JSONObject(res.getString("course_details"));\nres.close(); pstmt.close(); conn.close();`,
    match: "Matches Reference Example 2: JSON processing can bypass ResultSet.close().",
    action: normalPath,
    pattern: jdbcPattern,
    preserve: ["Course query", "Seven parameters", "Empty-object behavior"],
    risk: "Failures may gradually exhaust the connection pool.",
    verify: [
      "JSON exceptions close resources",
      "Query exceptions close resources",
      "Response remains unchanged",
    ],
  },
  {
    id: 6,
    severity: "HIGH",
    confidence: "HIGH",
    category: "Incomplete JDBC cleanup",
    file: "mps/MpsDAO.java",
    className: "MpsDAO",
    method: "getApplicantListForVerification(...) ",
    line: "80–145",
    resource: "First ResultSet and first PreparedStatement",
    problem:
      "The count-query statement reference is overwritten by the data-query statement. The first ResultSet and statement are not explicitly closed.",
    evidence: `pstmt = conn.prepareStatement(countQuery);\nResultSet res2 = pstmt.executeQuery();\npstmt = conn.prepareStatement(dataQuery);\nResultSet res = pstmt.executeQuery();`,
    match:
      "Matches Reference Example 1 because multiple resources are created but cleanup handles only the latest ones.",
    action:
      "Give the count and data queries separate try-with-resources scopes; finish and close the count resources before creating the data-query resources.",
    pattern: jdbcPattern,
    preserve: ["Count and list SQL", "Pagination", "Response keys"],
    risk: "Every successful call can retain the first statement and ResultSet.",
    verify: ["Count ResultSet closes first", "Both statements close", "Pagination output is unchanged"],
  },
  {
    id: 7,
    severity: "HIGH",
    confidence: "HIGH",
    category: "Incomplete JDBC cleanup",
    file: "mps/MpsDAO.java",
    className: "MpsDAO",
    method: "GetMPSAllocData(...) ",
    line: "149–217",
    resource: "First ResultSet and first PreparedStatement",
    problem:
      "The count-query statement is overwritten by the listing statement before the original statement and res2 are closed.",
    evidence: `pstmt = conn.prepareStatement(countQuery);\nResultSet res2 = pstmt.executeQuery();\npstmt = conn.prepareStatement(listQuery);\nResultSet res = pstmt.executeQuery();`,
    match: "Matches Reference Example 1: cleanup is incomplete for multiple resources.",
    action: "Use separate try-with-resources blocks for the count and list operations.",
    pattern: jdbcPattern,
    preserve: ["Search construction", "Pagination", "MPS JSON fields"],
    risk: "Successful execution can leak query-level resources.",
    verify: ["res2 closes", "Both statements close", "Counts and listing are unchanged"],
  },
  {
    id: 8,
    severity: "HIGH",
    confidence: "HIGH",
    category: "Multiple connections and incomplete cleanup",
    file: "dao/RestDaoImpl.java",
    className: "RestDaoImpl",
    method: "sendResetPswdOtp(...) ",
    line: "827–896",
    resource: "Two Connections, multiple PreparedStatements, ResultSet",
    problem:
      "The DB2 lookup statement is overwritten by a DB1 write statement. The original statement becomes unreachable, and exceptions bypass all normal close calls. Cleanup also closes the ResultSet last.",
    evidence: `PreparedStatement pstmt = conn.prepareStatement(GET_EXISTING_RESET_PSWD_OTP);\nResultSet rs = pstmt.executeQuery();\npstmt = conn2.prepareStatement(INSERT_RESET_PSWD_OTP);\npstmt.close(); conn.close(); conn2.close(); rs.close();`,
    match: "Matches both references: cleanup is incomplete and can be skipped on exception.",
    action:
      "Use separate DB2 lookup and DB1 write scopes. Close each ResultSet before its statement and each statement before its connection.",
    pattern: jdbcPattern,
    preserve: ["OTP expiry calculation", "Email behavior", "DB1/DB2 query selection"],
    risk: "Both pooled connections and multiple query resources may be retained.",
    verify: [
      "Lookup resources close before write",
      "Both connections close on email failure",
      "OTP behavior is unchanged",
    ],
  },
  {
    id: 9,
    severity: "MEDIUM",
    confidence: "HIGH",
    category: "Incomplete finally cleanup",
    file: "dao/RestDaoImpl.java",
    className: "RestDaoImpl",
    method: "sendRegistrationOtp(...) ",
    line: "302–399",
    resource: "Original DB2 PreparedStatement",
    problem:
      "The finally block closes only the current pstmt value after it may have been reassigned to a DB1 insert or update statement.",
    evidence: `pstmt = conn.prepareStatement(GET_EXISTING_OTP);\nrs = pstmt.executeQuery();\npstmt = conn2.prepareStatement(INSERT_OTP);\nfinally { if (pstmt != null) pstmt.close(); }`,
    match: "Matches Reference Example 1 because cleanup omits one created statement.",
    action: "Use distinct lookup and write statement variables or separate try-with-resources scopes.",
    pattern: jdbcPattern,
    preserve: ["Registration check", "OTP expiry", "Email and SMS behavior"],
    risk: "The lookup statement can remain open on insert and update paths.",
    verify: [
      "Lookup statement closes",
      "Write statement closes",
      "Both connections close",
      "OTP delivery is unchanged",
    ],
  },
  {
    id: 10,
    severity: "MEDIUM",
    confidence: "HIGH",
    category: "InputStream leak",
    file: "controller/ExamController.java",
    className: "ExamController",
    method: "Question-paper upload handler",
    line: "2645–2688",
    resource: "Two multipart InputStreams",
    problem:
      "Streams passed directly to Tika are not assigned to inputStream1/inputStream2, so the finally block only checks variables that remain null.",
    evidence: `InputStream inputStream1 = null;\nString type = tika.detect(file1.getInputStream());\nfinally { if (inputStream1 != null) inputStream1.close(); }`,
    match: "Cleanup exists but targets different variables than the streams actually opened.",
    action: "Wrap each file.getInputStream() call in its own try-with-resources block.",
    pattern: `try (InputStream in = file.getInputStream()) {\n  String contentType = tika.detect(in);\n}`,
    preserve: ["Allowed content types", "S3 paths", "Redirect messages"],
    risk: "Repeated uploads can retain multipart temporary-file handles.",
    verify: ["Both streams close", "Early returns close streams", "Validation behavior is unchanged"],
  },
  ...[11, 12].map((id, index): Omit<Finding, "fixSteps" | "whySafe"> => ({
    id,
    severity: "MEDIUM",
    confidence: "HIGH",
    category: "FileInputStream leak",
    file: "utils/Base64ProfileImage.java",
    className: "Base64ProfileImage",
    method: index === 0 ? "getBase64OfProfileImage(...)" : "getBase64OfOfficerProfileImage(...)",
    line: index === 0 ? "22–43" : "45–66",
    resource: "FileInputStream",
    problem: "The FileInputStream is read into a byte array but is never closed on success or failure.",
    evidence: `InputStream iSteamReader = new FileInputStream(downloadFile);\nbyte[] imageBytes = IOUtils.toByteArray(iSteamReader);`,
    match: "Matches Reference Example 1 for an explicitly managed file resource.",
    action: "Open the FileInputStream inside try-with-resources.",
    pattern: `try (InputStream in = new FileInputStream(downloadFile)) {\n  byte[] imageBytes = IOUtils.toByteArray(in);\n}`,
    preserve: ["Profile directory", "Base64 encoding", "Data-URI format"],
    risk: "Repeated image reads can exhaust file descriptors and hold files open.",
    verify: ["Stream closes on success", "Stream closes on read failure", "Base64 output is unchanged"],
  })),
  {
    id: 13,
    severity: "MEDIUM",
    confidence: "HIGH",
    category: "HTTP response stream leak",
    file: "utils/SendSMS.java",
    className: "SendSMS",
    method: "sendSms(...) ",
    line: "37–112",
    resource: "BufferedReader, HTTP entity stream, HttpClient",
    problem:
      "The response reader is never closed, leaving its entity stream and HTTP connection without deterministic cleanup.",
    evidence: `HttpResponse response = client.execute(post);\nBufferedReader bf = new BufferedReader(new InputStreamReader(response.getEntity().getContent()));\nwhile ((line = bf.readLine()) != null) { ... }`,
    match: "An explicitly managed response stream has no close path.",
    action:
      "Use try-with-resources for the reader and release or shut down the legacy HTTP client according to its API.",
    pattern: `try (BufferedReader reader = new BufferedReader(new InputStreamReader(stream))) {\n  // existing read loop\n}`,
    preserve: ["SMS endpoint", "Form fields", "Hash generation"],
    risk: "Sockets may remain leased and block later SMS calls.",
    verify: ["Reader closes on success", "Reader closes on failure", "HTTP connection releases"],
  },
  {
    id: 14,
    severity: "MEDIUM",
    confidence: "HIGH",
    category: "HTTP exception-path cleanup",
    file: "utils/Captcha.java",
    className: "Captcha",
    method: "verifyCaptcha(...) ",
    line: "26–75",
    resource: "OutputStream, BufferedReader, HttpURLConnection",
    problem: "Both streams are closed only normally, and the HTTP connection is not explicitly disconnected.",
    evidence: `OutputStream os = con.getOutputStream();\nos.write(...); os.close();\nBufferedReader in = new BufferedReader(new InputStreamReader(con.getInputStream()));\nin.close();`,
    match:
      "Matches Reference Example 2 because stream cleanup can be skipped by write, read, or parsing exceptions.",
    action: "Use try-with-resources for both streams and disconnect the connection in finally.",
    pattern: `try (OutputStream out = con.getOutputStream()) { /* write */ }\ntry (BufferedReader in = new BufferedReader(new InputStreamReader(con.getInputStream()))) { /* read */ }`,
    preserve: ["CAPTCHA endpoint", "Score threshold", "Boolean result"],
    risk: "Network failures can retain sockets.",
    verify: ["Output closes on write failure", "Reader closes on parse failure", "Connection disconnects"],
  },
  {
    id: 15,
    severity: "MEDIUM",
    confidence: "HIGH",
    category: "Multipart InputStream leak",
    file: "service/ProgrammeServiceImpl.java",
    className: "ProgrammeServiceImpl",
    method: "updateProgrammeMaster(...) ",
    line: "405–630",
    resource: "Three multipart InputStreams",
    problem:
      "Three Part input streams are opened through chained readAllBytes() calls without being stored or closed.",
    evidence: `byte[] fileBytes = part.getInputStream().readAllBytes();`,
    match: "Each expression opens a closeable stream with no cleanup.",
    action: "Wrap each Part.getInputStream() call in try-with-resources before readAllBytes().",
    pattern: `try (InputStream in = part.getInputStream()) {\n  byte[] fileBytes = in.readAllBytes();\n}`,
    preserve: ["MIME detection", "S3 key construction", "Upload order"],
    risk: "Multipart temporary resources can remain open.",
    verify: ["All three streams close", "Read failures close streams", "Uploaded bytes are unchanged"],
  },
  {
    id: 16,
    severity: "MEDIUM",
    confidence: "HIGH",
    category: "Reader exception-path cleanup",
    file: "service/TransactionServiceImpl.java",
    className: "TransactionServiceImpl",
    method: "getRequeryResponse(...) ",
    line: "173–202",
    resource: "BufferedReader and URL input stream",
    problem: "reader.close() occurs only after the response loop; an IOException during reading bypasses it.",
    evidence: `BufferedReader reader = new BufferedReader(new InputStreamReader(httpconn.getInputStream()));\nwhile ((line = reader.readLine()) != null) { ... }\nreader.close();`,
    match: "Matches Reference Example 2 because cleanup can be skipped while processing the resource.",
    action: "Use try-with-resources around the reader.",
    pattern: `try (BufferedReader reader = new BufferedReader(new InputStreamReader(httpconn.getInputStream()))) {\n  // existing loop\n}`,
    preserve: ["Atom URL", "Response concatenation", "Failure return"],
    risk: "Read failures can retain response streams and sockets.",
    verify: ["Reader closes on success", "Reader closes on IOException", "Response content is unchanged"],
  },
  {
    id: 17,
    severity: "MEDIUM",
    confidence: "HIGH",
    category: "HTTP client cleanup",
    file: "utils/Utility.java",
    className: "Utility",
    method: "httpPostMethode(...) ",
    line: "42–109",
    resource: "CloseableHttpClient",
    problem:
      "The reader and request are handled, but the CloseableHttpClient is not closed. releaseConnection() also lacks a null check and can interrupt later cleanup.",
    evidence: `httpClient = HttpClients.custom().setSSLSocketFactory(sslSF).build();\nHttpResponse response = httpClient.execute(post);\nfinally { post.releaseConnection(); if (rd != null) rd.close(); }`,
    match: "Cleanup is incomplete because the explicitly created closeable client remains open.",
    action:
      "Close the client in finally or try-with-resources and null-check post. Keep cleanup operations independent.",
    pattern: `try (CloseableHttpClient client = HttpClients.custom().build()) {\n  // existing request and response handling\n}`,
    preserve: ["SSL configuration", "POST request", "Response parsing"],
    risk: "Repeated calls can retain connection-manager and socket resources.",
    verify: ["Reader closes", "Request releases", "Client closes", "Partial initialization is safe"],
  },
];

type FixExplanation = Pick<Finding, "action" | "fixSteps" | "pattern" | "whySafe"> &
  Pick<Finding, "bestPractices">;

const fixExplanations: Record<number, FixExplanation> = {
  1: {
    action:
      "Make the connection, statement, and ResultSet one managed unit so cleanup cannot be skipped when the query or result processing fails.",
    fixSteps: [
      "Open the Connection in the outer try-with-resources header.",
      "Create the PreparedStatement from that connection in the same header and keep the existing parameter bindings in their current order.",
      "Open the ResultSet in the same header, then run the existing scmId extraction inside the block.",
      "Remove the three manual close calls; try-with-resources will close ResultSet, statement, then connection automatically.",
    ],
    pattern: `try (Connection conn = dataSource.getConnection();\n     PreparedStatement studentStmt = conn.prepareStatement(studentCourseQuery)) {\n    // Keep the existing parameter bindings here.\n    try (ResultSet studentRs = studentStmt.executeQuery()) {\n        if (studentRs.next()) {\n            scmId = studentRs.getLong("scmd_id");\n        }\n    }\n}\nreturn scmId;`,
    whySafe:
      "The value is still read from the same column and returned through the existing scmId variable. The only lifecycle change is deterministic reverse-order cleanup: studentRs → studentStmt → conn, including exception paths.",
  },
  2: {
    action:
      "Keep the coordinator query and JSON conversion inside managed JDBC scopes so invalid JSON cannot bypass database cleanup.",
    fixSteps: [
      "Open the Connection and coordinator PreparedStatement with try-with-resources.",
      "Retain every existing parameter binding exactly as written.",
      "Open coordinatorRs in a nested managed scope and construct the JSONArray inside that scope.",
      "Delete the manual close calls after confirming no later code uses these resources.",
    ],
    pattern: `try (Connection conn = dataSource.getConnection();\n     PreparedStatement coordinatorStmt = conn.prepareStatement(coordinatorQuery)) {\n    // Keep existing bindings.\n    try (ResultSet coordinatorRs = coordinatorStmt.executeQuery()) {\n        if (coordinatorRs.next()) {\n            result = new JSONArray(coordinatorRs.getString("ts"));\n        }\n    }\n}\nreturn result;`,
    whySafe:
      "JSONArray construction and the query remain unchanged. If either throws, coordinatorRs, coordinatorStmt, and conn still close automatically before control reaches the existing error handling.",
  },
  3: {
    action:
      "Manage the allocation ResultSet together with its statement and connection, including the JSON conversion path.",
    fixSteps: [
      "Create the Connection and allocation statement in try-with-resources.",
      "Leave the six existing parameter assignments in the same order.",
      "Read report and build the JSONArray while allocationRs is still inside its managed scope.",
      "Preserve the current empty-result value and remove only the manual cleanup calls.",
    ],
    pattern: `try (Connection conn = dataSource.getConnection();\n     PreparedStatement allocationStmt = conn.prepareStatement(allocationQuery)) {\n    // Keep all six existing bindings.\n    try (ResultSet allocationRs = allocationStmt.executeQuery()) {\n        if (allocationRs.next() && allocationRs.getString("report") != null) {\n            result = new JSONArray(allocationRs.getString("report"));\n        }\n    }\n}\nreturn result;`,
    whySafe:
      "The SQL, bindings, null check, and returned array do not change. Cleanup becomes guaranteed in allocationRs → allocationStmt → conn order even when the database value is invalid JSON.",
  },
  4: {
    action: "Place fee-detail querying and JSONObject construction inside managed JDBC scopes.",
    fixSteps: [
      "Open the Connection and fee statement with try-with-resources.",
      "Keep the current database function and its parameter bindings unchanged.",
      "Iterate feeRs and create feeDataJson inside the ResultSet scope.",
      "Remove the trailing close calls and retain the current null result when no row is returned.",
    ],
    pattern: `try (Connection conn = dataSource.getConnection();\n     PreparedStatement feeStmt = conn.prepareStatement(feeQuery)) {\n    // Keep existing function parameters.\n    try (ResultSet feeRs = feeStmt.executeQuery()) {\n        while (feeRs.next()) {\n            feeDataJson = new JSONObject(\n                feeRs.getString("get_applicant_total_fee_details_by_lsc_mapper_id")\n            );\n        }\n    }\n}\nreturn feeDataJson;`,
    whySafe:
      "Only ownership changes. The same rows populate the same variable, while malformed JSON or JDBC failures can no longer leave feeRs, feeStmt, or conn open.",
  },
  5: {
    action: "Give the other-exam query a complete managed lifecycle that includes JSONObject creation.",
    fixSteps: [
      "Open the Connection and exam statement in try-with-resources.",
      "Keep all seven parameter bindings and their order unchanged.",
      "Execute the query and construct result inside a nested ResultSet scope.",
      "Remove the manual closes while preserving the existing empty-object behavior.",
    ],
    pattern: `try (Connection conn = dataSource.getConnection();\n     PreparedStatement examStmt = conn.prepareStatement(otherExamQuery)) {\n    // Keep all seven existing bindings.\n    try (ResultSet examRs = examStmt.executeQuery()) {\n        if (examRs.next()) {\n            result = new JSONObject(examRs.getString("course_details"));\n        }\n    }\n}\nreturn result;`,
    whySafe:
      "The query contract and JSON response remain the same. The managed scopes guarantee examRs → examStmt → conn cleanup when execution, reading, or JSON parsing fails.",
  },
  6: {
    action:
      "Use one outer connection, then give the count query and applicant-list query separate statement and ResultSet scopes.",
    fixSteps: [
      "Open conn once in an outer try-with-resources block so both queries use the same connection as today.",
      "Run countQuery with countStmt and countRs; read the total count completely inside that nested block.",
      "Allow the count block to end before creating listStmt. This closes countRs and countStmt before the listing query starts.",
      "Run dataQuery with listStmt and listRs, keeping the existing pagination bindings and JSON-building logic.",
      "Do not reuse pstmt or res names across the two operations; separate names make ownership visible and prevent overwriting.",
    ],
    pattern: `try (Connection conn = dataSource.getConnection()) {\n    try (PreparedStatement countStmt = conn.prepareStatement(countQuery);\n         ResultSet countRs = countStmt.executeQuery()) {\n        if (countRs.next()) {\n            totalCount = countRs.getInt(1); // Use the existing count column/read logic.\n        }\n    } // countRs and countStmt are closed automatically here.\n\n    try (PreparedStatement listStmt = conn.prepareStatement(dataQuery)) {\n        // Keep the existing pagination parameter bindings here.\n        try (ResultSet listRs = listStmt.executeQuery()) {\n            // Preserve the existing applicant JSON-building loop.\n        } // listRs.close() is called automatically here, even if processing fails.\n    } // listStmt.close() is called automatically after listRs is closed.\n} // conn.close() is called automatically after both query operations finish.`,
    whySafe:
      "The queries still run in count-then-list order on one connection. The first resources can no longer become unreachable: closure is countRs → countStmt, then listRs → listStmt, and finally conn.",
    bestPractices: [
      {
        tip: "Own each ResultSet directly with try-with-resources.",
        reason:
          "Closing a PreparedStatement will normally close its current ResultSet, but relying on that indirect behavior hides ownership. It is especially unsafe here because reassigning pstmt loses access to the first statement and its ResultSet.",
      },
      {
        tip: "Use different names for countStmt/countRs and listStmt/listRs.",
        reason:
          "Distinct names prevent accidental reassignment and make it immediately clear which statement created each ResultSet.",
      },
      {
        tip: "Keep each JDBC scope as narrow as possible.",
        reason:
          "The count resources can close before the listing query begins, reducing the time database cursors and statement resources remain allocated.",
      },
      {
        tip: "Let try-with-resources perform cleanup instead of adding manual close calls.",
        reason:
          "Java closes resources in reverse declaration order and still attempts the remaining closes when processing fails. This produces listRs → listStmt → conn cleanup without duplicated close logic.",
      },
      {
        tip: "Preserve the original response types while correcting resource ownership.",
        reason:
          "The current count is a String and is returned in both total-record fields. Changing it to an int during this fix could create an unrelated client compatibility change.",
      },
    ],
  },
  7: {
    action:
      "Separate the allocation count and allocation listing into two clearly owned JDBC operations on the existing connection.",
    fixSteps: [
      "Open one outer Connection scope.",
      "Execute countQuery through countStmt/countRs and finish reading the count before leaving that block.",
      "Create listStmt only after the count block has closed.",
      "Keep the existing search construction, pagination bindings, and MPS JSON loop inside the listing scope.",
      "Remove reassignment of the shared pstmt variable.",
    ],
    pattern: `try (Connection conn = dataSource.getConnection()) {\n    try (PreparedStatement countStmt = conn.prepareStatement(countQuery);\n         ResultSet countRs = countStmt.executeQuery()) {\n        // Preserve existing total-count extraction.\n    }\n\n    try (PreparedStatement listStmt = conn.prepareStatement(listQuery)) {\n        // Preserve search and pagination bindings.\n        try (ResultSet listRs = listStmt.executeQuery()) {\n            // Preserve existing MPS allocation JSON mapping.\n        }\n    }\n}`,
    whySafe:
      "Search, count, and listing behavior stay intact, but each ResultSet is tied to the statement that created it. No statement reference is overwritten, and all resources close on both success and failure.",
  },
  8: {
    action:
      "Model the DB2 lookup and DB1 OTP write as separate managed operations; never store statements from different connections in one variable.",
    fixSteps: [
      "Open the DB2 lookup connection, lookupStmt, and lookupRs in one scope and copy the values needed for the decision into ordinary variables.",
      "Close the DB2 lookup resources before starting the DB1 insert/update operation unless the existing transaction design requires both connections concurrently.",
      "Open the DB1 connection and writeStmt in their own managed scope and preserve the current insert/update selection.",
      "Keep email dispatch and expiry calculation in their existing behavioral position, but ensure database resources are not kept open longer than required.",
      "Remove the shared pstmt variable and the incorrect manual close order.",
    ],
    pattern: `OtpState otpState;\ntry (Connection lookupConn = db2DataSource.getConnection();\n     PreparedStatement lookupStmt = lookupConn.prepareStatement(GET_EXISTING_RESET_PSWD_OTP);\n     ResultSet lookupRs = lookupStmt.executeQuery()) {\n    otpState = readExistingOtpState(lookupRs); // Existing extraction logic.\n}\n\ntry (Connection writeConn = db1DataSource.getConnection();\n     PreparedStatement writeStmt = writeConn.prepareStatement(writeSql)) {\n    // Keep existing insert/update bindings and executeUpdate().\n}\n// Preserve the existing email/response behavior.`,
    whySafe:
      "Each statement is closed by the connection that created it, and the lookup ResultSet closes before its statement. The OTP rules and DB1/DB2 responsibilities remain unchanged; only resource lifetime and variable ownership become explicit.",
  },
  9: {
    action:
      "Replace the reassigned statement with distinct DB2 lookup and DB1 write scopes so the finally block cannot close only the last statement.",
    fixSteps: [
      "Read the existing OTP through lookupConn, lookupStmt, and lookupRs and copy the required state into local values.",
      "End the lookup scope before opening the insert or update statement where transaction behavior allows.",
      "Execute the DB1 change through writeConn and writeStmt in a separate scope.",
      "Keep registration checks, expiry rules, email, and SMS behavior unchanged.",
      "Delete shared pstmt cleanup after all created resources are managed by their own scopes.",
    ],
    pattern: `try (Connection lookupConn = db2DataSource.getConnection();\n     PreparedStatement lookupStmt = lookupConn.prepareStatement(GET_EXISTING_OTP);\n     ResultSet lookupRs = lookupStmt.executeQuery()) {\n    // Preserve existing registration and OTP-state checks.\n}\n\ntry (Connection writeConn = db1DataSource.getConnection();\n     PreparedStatement writeStmt = writeConn.prepareStatement(writeSql)) {\n    // Preserve existing INSERT_OTP or UPDATE_OTP bindings.\n    writeStmt.executeUpdate();\n}`,
    whySafe:
      "The original lookup statement remains reachable until it closes, and the write statement has independent ownership. Delivery and expiry decisions do not change, while both database paths now clean up during exceptions.",
  },
  10: {
    action: "Detect each uploaded file from the exact stream variable owned by a try-with-resources block.",
    fixSteps: [
      "Open file1.getInputStream() as questionPaperStream and call tika.detect(questionPaperStream) inside that block.",
      "Let the first stream close before processing the second file.",
      "Repeat with file2.getInputStream() as answerKeyStream.",
      "Keep every allowed-type check, early return, S3 key, and redirect message unchanged.",
      "Remove inputStream1/inputStream2 and their ineffective finally cleanup after replacing all uses.",
    ],
    pattern: `String questionPaperType;\ntry (InputStream questionPaperStream = file1.getInputStream()) {\n    questionPaperType = tika.detect(questionPaperStream);\n}\n\nString answerKeyType;\ntry (InputStream answerKeyStream = file2.getInputStream()) {\n    answerKeyType = tika.detect(answerKeyStream);\n}\n// Preserve existing validation and S3 upload flow.`,
    whySafe:
      "Tika receives the same multipart content, but the opened stream and the closed stream are now the same object. Each stream closes before any later validation return or upload failure can bypass cleanup.",
  },
  11: {
    action:
      "Read the student profile image through a managed FileInputStream and perform Base64 conversion inside that scope.",
    fixSteps: [
      "Keep the existing student-profile path and downloadFile construction.",
      "Open profileStream with try-with-resources.",
      "Call IOUtils.toByteArray(profileStream) inside the block.",
      "Build the same Base64 data URI after the bytes have been read; no explicit close call is needed.",
    ],
    pattern: `byte[] imageBytes;\ntry (InputStream profileStream = new FileInputStream(downloadFile)) {\n    imageBytes = IOUtils.toByteArray(profileStream);\n}\nreturn "data:image/jpeg;base64,"\n    + Base64.getEncoder().encodeToString(imageBytes);`,
    whySafe:
      "The same file bytes and encoding are used. The stream closes immediately after reading, including when IOUtils throws, so repeated profile requests do not accumulate file handles.",
  },
  12: {
    action:
      "Read the officer profile image through its own managed FileInputStream before producing the existing Base64 value.",
    fixSteps: [
      "Retain the officer-profile directory and filename rules.",
      "Open officerProfileStream in try-with-resources.",
      "Read all bytes inside that scope, then encode them using the current format.",
      "Preserve the existing missing-file/error behavior.",
    ],
    pattern: `byte[] imageBytes;\ntry (InputStream officerProfileStream = new FileInputStream(downloadFile)) {\n    imageBytes = IOUtils.toByteArray(officerProfileStream);\n}\nreturn "data:image/jpeg;base64,"\n    + Base64.getEncoder().encodeToString(imageBytes);`,
    whySafe:
      "Only the stream lifetime changes. Officer image lookup, byte content, and data-URI formatting remain unchanged, while success and read-failure paths both release the file handle.",
  },
  13: {
    action:
      "Own the SMS response body reader explicitly and release the legacy HTTP connection/client after the response is consumed.",
    fixSteps: [
      "Execute the existing POST request with the same endpoint, headers, form fields, and hash.",
      "Open smsReader from response.getEntity().getContent() in try-with-resources.",
      "Keep the current line-reading and response-building logic inside that block.",
      "After the reader closes, release the request/connection using the exact API supported by the project’s HttpClient version.",
      "If the concrete client is closeable, close it in an outer finally or try-with-resources scope.",
    ],
    pattern: `HttpResponse response = client.execute(post);\ntry (BufferedReader smsReader = new BufferedReader(\n        new InputStreamReader(response.getEntity().getContent()))) {\n    String line;\n    while ((line = smsReader.readLine()) != null) {\n        // Preserve existing response handling.\n    }\n} finally {\n    post.releaseConnection(); // Use the equivalent API for this client version.\n}\n// Also close/shutdown client when its concrete type supports it.`,
    whySafe:
      "The request payload and response parsing remain unchanged. Closing the entity stream returns or releases the leased HTTP connection even when reading fails; client cleanup prevents connection-manager resources from accumulating.",
  },
  14: {
    action:
      "Manage the CAPTCHA request and response streams separately, then always disconnect the HttpURLConnection.",
    fixSteps: [
      "Create and configure con exactly as today.",
      "Write the existing request body inside a try-with-resources OutputStream block.",
      "After that block closes, read the response inside a separate BufferedReader block and preserve the current parsing logic.",
      "Put con.disconnect() in finally so connect, write, read, and parsing failures all release the connection.",
      "Retain the existing score threshold and boolean result rules.",
    ],
    pattern: `HttpURLConnection con = null;\ntry {\n    con = (HttpURLConnection) verifyUrl.openConnection();\n    // Preserve existing method, headers, and timeouts.\n    try (OutputStream requestBody = con.getOutputStream()) {\n        requestBody.write(payload.getBytes(StandardCharsets.UTF_8));\n    }\n    try (BufferedReader responseReader = new BufferedReader(\n            new InputStreamReader(con.getInputStream(), StandardCharsets.UTF_8))) {\n        // Preserve response collection and CAPTCHA score parsing.\n    }\n} finally {\n    if (con != null) con.disconnect();\n}`,
    whySafe:
      "Request bytes, response parsing, threshold, and return value stay the same. Both streams close at the end of their operation and disconnect runs regardless of where an exception occurs.",
  },
  15: {
    action:
      "Read each multipart Part through a named managed stream instead of chaining getInputStream().readAllBytes().",
    fixSteps: [
      "For the first Part, open a named stream, read its bytes, and close it before MIME detection/upload continues.",
      "Repeat the same isolated scope for the second and third Part; do not reuse one stream variable across files.",
      "Keep the existing empty-file checks and upload order.",
      "Preserve MIME detection, S3 bucket/key construction, and the exact byte arrays passed to upload.",
    ],
    pattern: `byte[] firstFileBytes;\ntry (InputStream firstFileStream = firstPart.getInputStream()) {\n    firstFileBytes = firstFileStream.readAllBytes();\n}\n\nbyte[] secondFileBytes;\ntry (InputStream secondFileStream = secondPart.getInputStream()) {\n    secondFileBytes = secondFileStream.readAllBytes();\n}\n\nbyte[] thirdFileBytes;\ntry (InputStream thirdFileStream = thirdPart.getInputStream()) {\n    thirdFileBytes = thirdFileStream.readAllBytes();\n}\n// Preserve existing MIME checks and S3 uploads for each byte array.`,
    whySafe:
      "Each upload still receives the same bytes in the same order. Named scopes ensure every multipart temporary stream closes immediately after its content is copied, including partial-read failures.",
  },
  16: {
    action: "Keep the complete requery response-reading loop inside a managed BufferedReader scope.",
    fixSteps: [
      "Open requeryReader from httpconn.getInputStream() in try-with-resources.",
      "Move the existing while loop and response concatenation inside the block.",
      "Remove reader.close(); because the scope performs it automatically.",
      "Keep the Atom URL, encoding, failure return, and response text behavior unchanged.",
    ],
    pattern: `StringBuilder response = new StringBuilder();\ntry (BufferedReader requeryReader = new BufferedReader(\n        new InputStreamReader(httpconn.getInputStream()))) {\n    String line;\n    while ((line = requeryReader.readLine()) != null) {\n        response.append(line); // Preserve existing separator behavior, if any.\n    }\n}\nreturn response.toString();`,
    whySafe:
      "The same URL response is read and assembled in the same order. If opening or reading fails, the reader and underlying URL stream close before the existing catch path returns its failure value.",
  },
  17: {
    action:
      "Make the CloseableHttpClient the outer owned resource, and guard request cleanup so partial initialization cannot block client closure.",
    fixSteps: [
      "Build the client with the existing SSL socket factory inside try-with-resources.",
      "Create and execute the HttpPost inside that scope without changing its URL, headers, entity, or response parsing.",
      "Manage the response reader in a nested try-with-resources block.",
      "Release post in an inner finally only when it was successfully created.",
      "Allow the outer client scope to close last even if request creation, execution, or reader cleanup fails.",
    ],
    pattern: `HttpPost post = null;\ntry (CloseableHttpClient client = HttpClients.custom()\n        .setSSLSocketFactory(sslSF)\n        .build()) {\n    try {\n        post = new HttpPost(url);\n        // Preserve existing headers and request entity.\n        HttpResponse response = client.execute(post);\n        try (BufferedReader responseReader = new BufferedReader(\n                new InputStreamReader(response.getEntity().getContent()))) {\n            // Preserve existing response parsing.\n        }\n    } finally {\n        if (post != null) post.releaseConnection();\n    }\n}`,
    whySafe:
      "The custom SSL configuration and POST behavior are unchanged. Reader and request cleanup happen before the client closes, while the null guard ensures an early failure cannot throw from cleanup and hide the original error.",
  },
};

export const findings: Finding[] = baseFindings.map((finding) => ({
  ...finding,
  ...fixExplanations[finding.id],
}));

export type SecurityConcern = {
  id: string;
  severity: Severity;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  title: string;
  category: string;
  locations: Array<{
    file: string;
    method: string;
    line: string;
    role: string;
  }>;
  problem: string;
  evidence: string;
  flow: string[];
  reason: string;
  action: string;
  pattern: string;
  preserve: string[];
  verify: string[];
};

export const securityConcerns: SecurityConcern[] = [
  {
    id: "SEC-01",
    severity: "HIGH",
    confidence: "HIGH",
    title: "Unparameterized applicant-search conditions",
    category: "SQL injection",
    locations: [
      {
        file: "mps/FetchMPSDetails.java",
        method: "getApplicantListForVerification request handler",
        line: "54–60",
        role: "Source: reads the search term from the HTTP request and builds a SQL fragment",
      },
      {
        file: "mps/MpsDAO.java",
        method: "getApplicantListForVerification(...) ",
        line: "80–145",
        role: "Sink: concatenates the fragment into the count and listing queries",
      },
    ],
    problem:
      "The search term originates from the HTTP request and is concatenated into both SQL strings. It is interpreted as part of the SQL command instead of being handled only as data.",
    evidence: `// mps/FetchMPSDetails.java:54–58\nsearchQuery = " AND (lower(ud.user_name) LIKE '" + search + "%' ... )";\n\n// mps/MpsDAO.java:88–106\nString countQuery = "SELECT count(*) FROM ... " + search;\nString dataQuery = "SELECT ... " + search + " LIMIT ? OFFSET ?";`,
    flow: [
      "The request handler reads sSearch from the incoming HTTP request.",
      "It concatenates that value into searchQuery.",
      "The DAO appends searchQuery to two SQL statements.",
      "The database parses the resulting text as SQL.",
    ],
    reason:
      "LIMIT and OFFSET are parameterized, but the four search conditions are not. A caller can send an HTTP request directly, so validation or escaping in the browser cannot protect the database query.",
    action:
      "Build both queries from fixed SQL text. Bind the username, email, mobile number, and application-number search patterns with PreparedStatement.setString(...), followed by the existing LIMIT and OFFSET parameters in the listing query.",
    pattern: `boolean hasSearch = search != null && !search.isBlank();
String filter = hasSearch
    ? " AND (lower(ud.user_name) LIKE ? OR lower(email_id) LIKE ? "
        + "OR mobile_no LIKE ? OR application_no LIKE ?)"
    : "";

String searchPattern = hasSearch
    ? search.toLowerCase(Locale.ROOT) + "%"
    : null;
String count = "0"; // Preserve the existing response type.

String countQuery = COUNT_QUERY_BASE + filter;
try (PreparedStatement countStmt = conn.prepareStatement(countQuery)) {
    if (hasSearch) {
        countStmt.setString(1, searchPattern);
        countStmt.setString(2, searchPattern);
        countStmt.setString(3, searchPattern);
        countStmt.setString(4, searchPattern);
    }
    try (ResultSet countRs = countStmt.executeQuery()) {
        if (countRs.next()) {
            count = countRs.getString("count");
        }
    }
}

if ("-1".equals(length)) {
    length = count;
}

String dataQuery = DATA_QUERY_BASE + filter
    + " ORDER BY user_name LIMIT ? OFFSET ?";
try (PreparedStatement listStmt = conn.prepareStatement(dataQuery)) {
    int parameter = 1;
    if (hasSearch) {
        listStmt.setString(parameter++, searchPattern);
        listStmt.setString(parameter++, searchPattern);
        listStmt.setString(parameter++, searchPattern);
        listStmt.setString(parameter++, searchPattern);
    }
    listStmt.setInt(parameter++, Integer.parseInt(length));
    listStmt.setInt(parameter, Integer.parseInt(offSet));

    try (ResultSet listRs = listStmt.executeQuery()) {
        // Preserve the existing applicant JSON-building loop.
    }
}`,
    preserve: [
      "The same four searchable fields",
      "Case-insensitive prefix matching",
      "Count and listing filters",
      "Pagination and response JSON types",
    ],
    verify: [
      "Normal searches return the same records",
      "An apostrophe does not break the query",
      "SQL-like input is treated only as search text",
      "Count and listing totals remain consistent",
      "An empty search still returns the unfiltered list",
    ],
  },
];

export const auditSummary = {
  auditDate: "31 August 2026",
  filesInspected: 790,
  javaFiles: 790,
  jdbcFiles: 40,
  hibernateFiles: 53,
  closeableFiles: 48,
  confirmed: 17,
  likely: 0,
  possible: 0,
};
