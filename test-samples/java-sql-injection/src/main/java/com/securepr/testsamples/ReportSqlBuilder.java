package com.securepr.testsamples;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

/**
 * Test fixture for SecurePR AI: a "SQL builder" style class mixing safe and
 * unsafe query construction, to check the scanner distinguishes them correctly.
 */
public class ReportSqlBuilder {

    private final Connection connection;

    public ReportSqlBuilder(Connection connection) {
        this.connection = connection;
    }

    /** Vulnerable: table name and a WHERE clause fragment both come from caller input. */
    public ResultSet runReport(String tableName, String whereClause) throws SQLException {
        Statement stmt = connection.createStatement();
        String query = "SELECT * FROM " + tableName + " WHERE " + whereClause;
        return stmt.executeQuery(query);
    }

    /** Vulnerable: numeric-looking input still concatenated instead of bound. */
    public ResultSet ordersAboveAmount(String minAmount) throws SQLException {
        Statement stmt = connection.createStatement();
        String query = "SELECT id, customer_id, total FROM orders WHERE total > " + minAmount;
        return stmt.executeQuery(query);
    }

    /**
     * Safe counter-example: same intent as findByUsername in UserDao, but using
     * a PreparedStatement with a bound parameter. Included so the scanner's
     * findings can be checked for false positives too.
     */
    public ResultSet findOrderById(long orderId) throws SQLException {
        PreparedStatement ps = connection.prepareStatement(
            "SELECT id, customer_id, total FROM orders WHERE id = ?");
        ps.setLong(1, orderId);
        return ps.executeQuery();
    }
}
