package com.securepr.testsamples;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.sql.Statement;

/**
 * Test fixture for SecurePR AI: SQL injection via write statements
 * (UPDATE/DELETE/stored procedure calls), not just SELECT.
 */
public class OrderService {

    private final Connection connection;

    public OrderService(Connection connection) {
        this.connection = connection;
    }

    /** Vulnerable: UPDATE statement built from concatenated, unvalidated input. */
    public int applyDiscountCode(String orderId, String discountCode) throws SQLException {
        Statement stmt = connection.createStatement();
        String sql = "UPDATE orders SET discount_code = '" + discountCode
            + "', total = total * 0.9 WHERE id = '" + orderId + "'";
        return stmt.executeUpdate(sql);
    }

    /** Vulnerable: DELETE statement driven directly by a caller-supplied filter clause. */
    public int cancelOrdersMatching(String filterClause) throws SQLException {
        Statement stmt = connection.createStatement();
        String sql = "DELETE FROM orders WHERE " + filterClause;
        return stmt.executeUpdate(sql);
    }

    /** Vulnerable: stored procedure name and argument both concatenated into a CALL statement. */
    public boolean runInventoryProcedure(String procedureName, String warehouseId) throws SQLException {
        Statement stmt = connection.createStatement();
        String sql = "CALL " + procedureName + "('" + warehouseId + "')";
        return stmt.execute(sql);
    }

    /**
     * Safe counter-example: same cancel-order intent as cancelOrdersMatching, but scoped to a
     * single bound order id via PreparedStatement. Included for false-positive checking.
     */
    public int cancelOrderById(long orderId) throws SQLException {
        PreparedStatement ps = connection.prepareStatement("DELETE FROM orders WHERE id = ?");
        ps.setLong(1, orderId);
        return ps.executeUpdate();
    }
}
