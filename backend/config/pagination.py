from rest_framework.pagination import PageNumberPagination


class DefaultPagination(PageNumberPagination):
    """Page-number pagination the frontend DataTable can drive directly."""

    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 200
