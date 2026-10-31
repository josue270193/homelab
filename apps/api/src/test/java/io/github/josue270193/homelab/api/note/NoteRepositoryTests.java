package io.github.josue270193.homelab.api.note;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

// Full context: Flyway runs V1 against H2 (PostgreSQL mode), then Hibernate validates the entity.
@SpringBootTest
@ActiveProfiles("test")
class NoteRepositoryTests {

    @Autowired
    NoteRepository notes;

    @Test
    void savesAndReadsANote() {
        Note saved = notes.saveAndFlush(new Note("hello"));

        Note found = notes.findById(saved.getId()).orElseThrow();
        assertThat(found.getBody()).isEqualTo("hello");
    }
}
