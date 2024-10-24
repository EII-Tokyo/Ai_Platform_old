import logging
import logging_loki

class ColoredFormatter(logging.Formatter):
    COLORS = {
        'DEBUG': "\033[0;32m",  # Green
        'INFO': "\033[0;34m",   # Bright Blue
        'WARNING': "\033[0;33m",  # Yellow
        'ERROR': "\033[0;31m",   # Red
        'CRITICAL': "\033[1;31m",  # Bright Red
    }
    RESET = "\033[0m"

    def format(self, record):
        log_fmt = self.COLORS.get(record.levelname, self.RESET) + super().format(record) + self.RESET
        return log_fmt

# 对 Loki 的配置进行一次性设置
def setup_logger():
    logger = logging.getLogger(__name__)

    # 如果已经有处理器了，不要重复添加
    if not logger.hasHandlers():
        # Loki 配置
        loki_handler = logging_loki.LokiHandler(
            url="http://loki:3100/loki/api/v1/push",  # 替换为你的 Loki 实例地址
            tags={"app": "yolotester_dev-backend-1"},
            version="1",
        )

        # 清空日志处理器的旧消息
        loki_handler.flush()

        # 设置日志格式
        stream_handler = logging.StreamHandler()
        formatter = ColoredFormatter('[%(lineno)d:%(filename)s] %(funcName)s()\n%(message)s')

        # 将格式器添加到处理器
        loki_handler.setFormatter(formatter)
        stream_handler.setFormatter(formatter)

        # 将处理器添加到 logger
        logger.addHandler(loki_handler)
        logger.addHandler(stream_handler)

        # 设置日志级别
        logger.setLevel(logging.DEBUG)

    return logger

# 对外提供 logger 对象
def get_logger():
    return setup_logger()

