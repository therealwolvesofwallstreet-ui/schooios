# Migrations — lưu ý vận hành

## Bảng append-only (immutable) ở tầng DB
`audit_logs` và `case_status_history` có **trigger `BEFORE UPDATE OR DELETE`** (`prevent_mutation()`)
chặn mọi `UPDATE`/`DELETE` ở mức row. `INSERT` vẫn cho phép (append). Đây là cách hiện thực
quy tắc "AuditLog immutable" trong CLAUDE.md ở tầng DB chứ không chỉ ở app.

### Khi cần backfill / sửa dữ liệu 2 bảng này trong migration tương lai
Trigger sẽ chặn `UPDATE`/`DELETE`. Trong **cùng một migration**, tạm gỡ rồi tạo lại:

```sql
-- 1) Gỡ trigger
DROP TRIGGER audit_logs_immutable ON "audit_logs";
-- (hoặc) DROP TRIGGER case_status_history_immutable ON "case_status_history";

-- 2) Chạy thao tác sửa/backfill cần thiết
--    UPDATE ... ;  DELETE ... ;

-- 3) Tạo lại trigger NGAY trong migration đó
CREATE TRIGGER audit_logs_immutable
  BEFORE UPDATE OR DELETE ON "audit_logs"
  FOR EACH ROW EXECUTE FUNCTION prevent_mutation();
```

> ⚠️ Đừng để migration kết thúc mà chưa tạo lại trigger — nếu không bảng sẽ mất tính bất biến.
> DDL (`ALTER TABLE`) **không** bị trigger chặn, chỉ DML (UPDATE/DELETE) bị chặn.

## Đối tượng không do Prisma quản (nằm trong migration init, không trong schema.prisma)
- `CREATE EXTENSION pg_trgm` — backing cho GIN trigram index (search ILIKE).
- `CREATE SEQUENCE case_code_seq` — backing cho `Case.case_code` default `CASE-YYYY-00001`.
- 2 trigger immutability ở trên.

Các index GIN (`cases_title_idx`, `cases_description_idx`) ĐƯỢC khai trong `schema.prisma`
(`type: Gin`, `ops: gin_trgm_ops`) nên Prisma quản và **không gây drift**.
