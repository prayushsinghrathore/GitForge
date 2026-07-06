"""DAG ancestry and lowest-common-ancestor (merge base) logic.

These tests run the graph algorithms over an in-memory commit fixture, proving
they are decoupled from storage.
"""

from __future__ import annotations

from app.core import dag
from app.core.objects import Commit


def make_graph(edges: dict[str, tuple[str, ...]]):
    """Build a ``load`` callback from ``child -> parents`` adjacency."""
    commits = {
        cid: Commit(tree_id="t", parents=parents, author="a", message=cid, timestamp=0)
        for cid, parents in edges.items()
    }
    # Commit ids are content hashes in production, but for graph tests we key by
    # the given labels directly.
    return lambda cid: commits[cid]


def test_ancestors_includes_self_and_all_reachable():
    load = make_graph({"C": ("B",), "B": ("A",), "A": ()})
    assert dag.ancestors("C", load) == {"A", "B", "C"}


def test_is_ancestor():
    load = make_graph({"C": ("B",), "B": ("A",), "A": ()})
    assert dag.is_ancestor("A", "C", load)
    assert not dag.is_ancestor("C", "A", load)


def test_merge_base_of_diverged_branches():
    #        D (ours)
    #       /
    #  A - B
    #       \
    #        E (theirs)
    load = make_graph({"D": ("B",), "E": ("B",), "B": ("A",), "A": ()})
    assert dag.merge_base("D", "E", load) == "B"


def test_merge_base_when_one_is_ancestor_of_other():
    load = make_graph({"C": ("B",), "B": ("A",), "A": ()})
    assert dag.merge_base("A", "C", load) == "A"


def test_merge_base_unrelated_histories_is_none():
    load = make_graph({"A": (), "X": ()})
    assert dag.merge_base("A", "X", load) is None


def test_merge_base_prefers_lowest_of_multiple_common_ancestors():
    #   A - B - C - D (ours)
    #            \
    #             E - F (theirs)   -> base should be C (lowest), not A/B
    load = make_graph(
        {
            "D": ("C",),
            "F": ("E",),
            "E": ("C",),
            "C": ("B",),
            "B": ("A",),
            "A": (),
        }
    )
    assert dag.merge_base("D", "F", load) == "C"
