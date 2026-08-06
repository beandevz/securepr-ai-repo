package com.securepr.testsamples;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

/**
 * Test fixture for SecurePR AI: intentionally vulnerable JDBC access code.
 * Used to validate that the scanner flags SQL injection findings — not for production use.
 */
public class UserDao {

    private final Connection connection;

    public UserDao(Connection connection) {
        this.connection = connection;
    }

    /** Vulnerable: user-controlled values concatenated directly into the query string. */
    public ResultSet login(String username, String password) throws SQLException {
        Statement stmt = connection.createStatement();
        String query = "SELECT * FROM users WHERE username = '" + username
            + "' AND password = '" + password + "'";
        return stmt.executeQuery(query);
    }

    /** Vulnerable: same pattern via String.format instead of plain concatenation. */
    public ResultSet findByUsername(String username) throws SQLException {
        Statement stmt = connection.createStatement();
        String query = String.format("SELECT id, email, role FROM users WHERE username = '%s'", username);
        return stmt.executeQuery(query);
    }

    /** Vulnerable: search filter built with a StringBuilder, still unsanitized. */
    public ResultSet searchByEmailDomain(String domain) throws SQLException {
        Statement stmt = connection.createStatement();
        StringBuilder sql = new StringBuilder("SELECT id, username FROM users WHERE email LIKE '%");
        sql.append(domain);
        sql.append("%'");
        return stmt.executeQuery(sql.toString());
    }

    /** Vulnerable: user input controls ORDER BY / sort direction directly. */
    public ResultSet listUsersSorted(String sortColumn, String sortDirection) throws SQLException {
        Statement stmt = connection.createStatement();
        String query = "SELECT id, username, created_at FROM users ORDER BY "
            + sortColumn + " " + sortDirection;
        return stmt.executeQuery(query);
    }
}
