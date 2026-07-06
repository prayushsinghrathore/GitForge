"""Object model: content addressing, determinism, and round-tripping."""

from __future__ import annotations

from app.core import Blob, Commit, EntryMode, Tree, TreeEntry


def test_blob_id_is_deterministic_and_content_addressed():
    assert Blob(b"hello").id == Blob(b"hello").id
    assert Blob(b"hello").id != Blob(b"world").id


def test_blob_round_trips():
    blob = Blob(b"some bytes\x00\x01")
    assert Blob.deserialize(blob.serialize()).data == blob.data


def test_empty_blob_and_empty_tree_have_different_ids():
    # The type is part of the hash header, so structurally-empty objects of
    # different kinds must not collide.
    assert Blob(b"").id != Tree.from_entries([]).id


def test_tree_id_independent_of_entry_insertion_order():
    a = Tree.from_entries(
        [
            TreeEntry("b.txt", EntryMode.FILE, "id2"),
            TreeEntry("a.txt", EntryMode.FILE, "id1"),
        ]
    )
    b = Tree.from_entries(
        [
            TreeEntry("a.txt", EntryMode.FILE, "id1"),
            TreeEntry("b.txt", EntryMode.FILE, "id2"),
        ]
    )
    assert a.id == b.id


def test_tree_round_trips():
    tree = Tree.from_entries(
        [
            TreeEntry("src", EntryMode.DIR, "treeid"),
            TreeEntry("readme.md", EntryMode.FILE, "blobid"),
        ]
    )
    restored = Tree.deserialize(tree.serialize())
    assert restored.id == tree.id
    assert {e.name for e in restored.entries} == {"src", "readme.md"}


def test_commit_round_trips_and_detects_merge():
    commit = Commit(
        tree_id="t1",
        parents=("p1", "p2"),
        author="Ada",
        message="Merge feature\n\nlong body",
        timestamp=1_700_000_000,
        files_changed=3,
        insertions=10,
        deletions=2,
    )
    restored = Commit.deserialize(commit.serialize())
    assert restored.id == commit.id
    assert restored.is_merge
    assert restored.message == "Merge feature\n\nlong body"
    assert (restored.files_changed, restored.insertions, restored.deletions) == (3, 10, 2)


def test_single_parent_commit_is_not_a_merge():
    assert not Commit("t", ("p",), "a", "m", 1).is_merge
    assert not Commit("t", (), "a", "root", 1).is_merge
