import { format } from 'sql-formatter';
import { describe, it, expect } from 'vitest';

describe('SQL Formatter', () => {
    it('should format a simple SQL query', () => {
        const unformattedSQL = 'SELECT id,name,email FROM users WHERE status=1 AND age>18 ORDER BY name ASC';

        const formattedSQL = format(unformattedSQL, {
            language: 'postgresql',
            keywordCase: 'upper',
            tabWidth: 2
        });

        // Log the actual formatted SQL for debugging
        console.log('Formatted SQL:', formattedSQL);

        // Test that the SQL is properly formatted (checking key aspects)
        expect(formattedSQL).toContain('SELECT');
        expect(formattedSQL).toContain('FROM');
        expect(formattedSQL).toContain('WHERE');
        expect(formattedSQL).toContain('ORDER BY');
        expect(formattedSQL).toMatch(/status\s*=\s*1/);
        expect(formattedSQL).toMatch(/age\s*>\s*18/);
    });

    it('should format a complex SQL query with joins', () => {
        const unformattedSQL = 'SELECT u.id,u.name,o.order_date,p.product_name FROM users u LEFT JOIN orders o ON u.id=o.user_id INNER JOIN products p ON o.product_id=p.id WHERE o.status="completed" GROUP BY u.id HAVING COUNT(o.id)>5';

        const formattedSQL = format(unformattedSQL, {
            language: 'postgresql',
            keywordCase: 'upper',
            tabWidth: 2
        });

        // Log the actual formatted SQL for debugging
        console.log('Formatted SQL:', formattedSQL);

        // Test that the SQL is properly formatted (checking key aspects)
        expect(formattedSQL).toContain('SELECT');
        expect(formattedSQL).toContain('FROM');
        expect(formattedSQL).toContain('LEFT JOIN');
        expect(formattedSQL).toContain('INNER JOIN');
        expect(formattedSQL).toContain('WHERE');
        expect(formattedSQL).toContain('GROUP BY');
        expect(formattedSQL).toContain('HAVING');
        expect(formattedSQL).toMatch(/status\s*=\s*"completed"/);
        expect(formattedSQL).toMatch(/COUNT\(o\.id\)\s*>\s*5/);
    });

    it('should format INSERT statement', () => {
        const unformattedSQL = 'INSERT INTO users(id,name,email,created_at)VALUES(1,"John Doe","john@example.com",NOW())';

        const formattedSQL = format(unformattedSQL, {
            language: 'postgresql',
            keywordCase: 'upper',
            tabWidth: 2
        });

        // Log the actual formatted SQL for debugging
        console.log('Formatted SQL:', formattedSQL);

        // Test that the SQL is properly formatted (checking key aspects)
        expect(formattedSQL).toContain('INSERT INTO');
        expect(formattedSQL).toContain('VALUES');
        expect(formattedSQL).toMatch(/users\s*\(/);
        expect(formattedSQL).toMatch(/"John Doe"/);
        expect(formattedSQL).toMatch(/NOW\(\)/);
    });

    it('should format CREATE TABLE statement', () => {
        const unformattedSQL = 'CREATE TABLE `country` (`country_id` smallint unsigned NOT NULL AUTO_INCREMENT,`country` varchar(50) NOT NULL,`last_update` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,PRIMARY KEY (`country_id`)) ENGINE=InnoDB AUTO_INCREMENT=110 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci';

        const formattedSQL = format(unformattedSQL, {
            language: 'mysql',
            keywordCase: 'upper',
            tabWidth: 2
        });

        // Log the actual formatted SQL for debugging
        console.log('Formatted SQL:', formattedSQL);

        // Test that the SQL is properly formatted (checking key aspects)
        expect(formattedSQL).toContain('CREATE TABLE');
        expect(formattedSQL).toContain('`country_id`');
        expect(formattedSQL).toContain('PRIMARY KEY');
        expect(formattedSQL).toContain('ENGINE =');
        expect(formattedSQL).toMatch(/AUTO_INCREMENT\s*=\s*110/);
        expect(formattedSQL).toMatch(/timestamp\s+NOT\s+NULL\s+DEFAULT\s+CURRENT_TIMESTAMP/i);
    });

    it('should format CREATE INDEX statements', () => {
        const unformattedSQL = 'CREATE INDEX `idx_title` (`title`) ON `film`;CREATE INDEX `idx_fk_original_language_id` (`original_language_id`) ON `film`';

        const formattedSQL = format(unformattedSQL, {
            language: 'mysql',
            keywordCase: 'upper',
            tabWidth: 2
        });

        // Log the actual formatted SQL for debugging
        console.log('Formatted SQL:', formattedSQL);

        // Test that the SQL is properly formatted (checking key aspects)
        expect(formattedSQL).toContain('CREATE INDEX');
        expect(formattedSQL).toContain('`idx_title`');
        expect(formattedSQL).toContain('`idx_fk_original_language_id`');
        expect(formattedSQL).toMatch(/ON\s+`film`/);
    });

    it('should format CREATE VIEW statement with complex joins', () => {
        const unformattedSQL = 'CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `film_list` AS select `film`.`film_id` AS `FID`,`film`.`title` AS `title`,`film`.`description` AS `description`,`category`.`name` AS `category`,`film`.`rental_rate` AS `price`,`film`.`length` AS `length`,`film`.`rating` AS `rating`,group_concat(concat(`actor`.`first_name`,_utf8mb4\' \',`actor`.`last_name`) separator \', \') AS `actors` from ((((`film` left join `film_category` on((`film_category`.`film_id` = `film`.`film_id`))) left join `category` on((`category`.`category_id` = `film_category`.`category_id`))) left join `film_actor` on((`film`.`film_id` = `film_actor`.`film_id`))) left join `actor` on((`film_actor`.`actor_id` = `actor`.`actor_id`))) group by `film`.`film_id`,`category`.`name`';

        const formattedSQL = format(unformattedSQL, {
            language: 'mysql',
            keywordCase: 'upper',
            tabWidth: 2
        });

        // Log the actual formatted SQL for debugging
        console.log('Formatted SQL:', formattedSQL);

        // Test that the SQL is properly formatted (checking key aspects)
        expect(formattedSQL).toContain('CREATE ALGORITHM = UNDEFINED');
        expect(formattedSQL).toContain('DEFINER =');
        expect(formattedSQL).toContain('SQL SECURITY DEFINER');
        expect(formattedSQL).toContain('VIEW');
        expect(formattedSQL).toContain('LEFT JOIN');
        expect(formattedSQL).toContain('GROUP BY');
        expect(formattedSQL).toMatch(/AS\s+SELECT/);
        expect(formattedSQL).toMatch(/`film`\.`film_id`\s+AS\s+`FID`/);
    });
}); 